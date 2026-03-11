from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

import asyncpg
import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from .config import Settings, TARGET_STOP_AREA_GIDS
from .models import DepartureDelayEvent, LineMetadata
from .repository import insert_events, upsert_line_metadata
from .vasttrafik_client import VasttrafikClient

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def _parse_iso(ts: str | None) -> datetime | None:
    if not ts:
        return None
    return datetime.fromisoformat(ts.replace("Z", "+00:00"))


def _extract_events(stop_gid: str, payload: dict, recorded_at: datetime) -> list[DepartureDelayEvent]:
    departures = payload.get("results") or payload.get("departures") or []
    events: list[DepartureDelayEvent] = []

    for dep in departures:
        planned = _parse_iso(dep.get("plannedTime") or dep.get("planned") or dep.get("scheduledTime"))
        estimated = _parse_iso(dep.get("estimatedTime") or dep.get("estimated") or dep.get("realtimeTime"))
        if planned is None:
            continue

        journey_gid = (
            dep.get("serviceJourney", {}).get("gid")
            or dep.get("journey", {}).get("gid")
            or dep.get("gid")
            or "unknown"
        )
        line_number = (
            dep.get("serviceJourney", {}).get("line", {}).get("shortName")
            or dep.get("line", {}).get("shortName")
            or dep.get("line", {}).get("name")
            or "?"
        )
        is_cancelled = bool(dep.get("isCancelled", False))
        realtime_missing = estimated is None
        delay_seconds = int((estimated - planned).total_seconds()) if estimated else None

        events.append(
            DepartureDelayEvent(
                recorded_at=recorded_at,
                stop_gid=stop_gid,
                journey_gid=str(journey_gid),
                line_number=str(line_number),
                planned_time=planned,
                estimated_time=estimated,
                delay_seconds=delay_seconds,
                is_cancelled=is_cancelled,
                realtime_missing=realtime_missing,
            )
        )

    return events


def _extract_line_metadata(payload: dict) -> list[LineMetadata]:
    departures = payload.get("results") or payload.get("departures") or []
    lines_seen: dict[str, LineMetadata] = {}

    for dep in departures:
        line_obj = dep.get("serviceJourney", {}).get("line") or dep.get("line") or {}
        line_number = line_obj.get("shortName") or line_obj.get("name")
        
        if not line_number:
            continue

        if line_number in lines_seen:
            continue

        foreground_color = line_obj.get("foregroundColor") or line_obj.get("fgColor")
        background_color = line_obj.get("backgroundColor") or line_obj.get("bgColor")
        text_color = line_obj.get("textColor")
        border_color = line_obj.get("borderColor")

        lines_seen[line_number] = LineMetadata(
            line_number=str(line_number),
            foreground_color=str(foreground_color) if foreground_color else None,
            background_color=str(background_color) if background_color else None,
            text_color=str(text_color) if text_color else None,
            border_color=str(border_color) if border_color else None,
        )

    return list(lines_seen.values())


async def run_poll_cycle(settings: Settings, pool: asyncpg.Pool, vt_client: VasttrafikClient) -> None:
    semaphore = asyncio.Semaphore(settings.http_concurrency)
    recorded_at = datetime.now(timezone.utc)

    async with httpx.AsyncClient() as http_client:
        async def fetch_for_stop(stop_gid: str) -> tuple[list[DepartureDelayEvent], list[LineMetadata]]:
            async with semaphore:
                try:
                    payload = await vt_client.fetch_departures(http_client, stop_gid)
                    events = _extract_events(stop_gid, payload, recorded_at)
                    lines = _extract_line_metadata(payload)
                    return events, lines
                except Exception as exc:
                    logger.warning("poll failed for stop %s: %s", stop_gid, exc)
                    return [], []

        result_sets = await asyncio.gather(*(fetch_for_stop(stop_gid) for stop_gid in TARGET_STOP_AREA_GIDS))

    events = [item for event_list, _ in result_sets for item in event_list]
    all_lines = [item for _, line_list in result_sets for item in line_list]

    async with pool.acquire() as conn:
        await insert_events(conn, events)
        await upsert_line_metadata(conn, all_lines)

    logger.info("poll cycle complete: inserted %s events and %s line metadata entries", len(events), len(all_lines))


async def main() -> None:
    settings = Settings()
    vt_client = VasttrafikClient(
        token_url=settings.vt_token_url,
        api_base_url=settings.vt_api_base_url,
        client_id=settings.vt_client_id,
        client_secret=settings.vt_client_secret,
    )

    pool = await asyncpg.create_pool(settings.database_url, min_size=1, max_size=5)
    scheduler = AsyncIOScheduler()
    scheduler.add_job(run_poll_cycle, "interval", seconds=settings.poll_interval_seconds, args=[settings, pool, vt_client])

    await run_poll_cycle(settings, pool, vt_client)
    scheduler.start()
    logger.info("scheduler started at %s second interval", settings.poll_interval_seconds)

    try:
        while True:
            await asyncio.sleep(3600)
    finally:
        scheduler.shutdown(wait=False)
        await pool.close()


if __name__ == "__main__":
    asyncio.run(main())
