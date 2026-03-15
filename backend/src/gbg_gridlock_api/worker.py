from __future__ import annotations

import asyncio
import logging
import time
from datetime import datetime, timezone

import asyncpg
import httpx

from .worker_models import DepartureDelayEvent, LineMetadata
from .worker_repository import insert_events, upsert_line_metadata
from .vasttrafik_client import VasttrafikClient
from .monitored_stops import MONITORED_STOP_AREA_GIDS
from .debug_metrics import record_poll_cycle, record_poll_request

logger = logging.getLogger(__name__)


TARGET_STOP_AREA_GIDS = list(MONITORED_STOP_AREA_GIDS)
ALLOWED_TRANSPORT_MODES = {"tram", "bus", "ferry", "boat"}


def _infer_transport_mode_from_line_number(line_number: str) -> str:
    """Fallback heuristic when API doesn't provide transportMode."""
    num = line_number.strip().upper()
    
    if num.startswith('2'):
        return "ferry"
    
    try:
        numeric_value = int(num)
        if 1 <= numeric_value <= 13:
            return "tram"
    except ValueError:
        pass
    
    return "bus"


def _transport_mode(dep: dict, line_number: str = "") -> str:
    line_obj = dep.get("serviceJourney", {}).get("line") or dep.get("line") or {}
    transport_mode = line_obj.get("transportMode") or dep.get("transportMode")
    
    if transport_mode:
        return str(transport_mode).lower()
    
    if line_number:
        return _infer_transport_mode_from_line_number(line_number)
    
    return ""


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
        
        transport_mode = _transport_mode(dep, line_number)
        if transport_mode not in ALLOWED_TRANSPORT_MODES:
            continue
        
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
                transport_mode=transport_mode,
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

        transport_mode = _transport_mode(dep, str(line_number))
        if transport_mode not in ALLOWED_TRANSPORT_MODES:
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
            transport_mode=transport_mode,
        )

    return list(lines_seen.values())


async def fetch_line_metadata_once(pool: asyncpg.Pool, vt_client: VasttrafikClient, http_concurrency: int) -> None:
    semaphore = asyncio.Semaphore(http_concurrency)

    async with httpx.AsyncClient() as http_client:
        async def fetch_metadata_for_stop(stop_gid: str) -> list[LineMetadata]:
            async with semaphore:
                try:
                    payload = await vt_client.fetch_departures(http_client, stop_gid)
                    return _extract_line_metadata(payload)
                except Exception as exc:
                    logger.warning("metadata fetch failed for stop %s: %s", stop_gid, exc)
                    return []

        result_sets = await asyncio.gather(*(fetch_metadata_for_stop(stop_gid) for stop_gid in TARGET_STOP_AREA_GIDS))

    all_lines = [item for line_list in result_sets for item in line_list]

    async with pool.acquire() as conn:
        await upsert_line_metadata(conn, all_lines)

    logger.info("startup line metadata fetch complete: cached %s line metadata entries", len(all_lines))


async def run_poll_cycle(pool: asyncpg.Pool, vt_client: VasttrafikClient, http_concurrency: int) -> None:
    semaphore = asyncio.Semaphore(http_concurrency)
    recorded_at = datetime.now(timezone.utc)

    async with httpx.AsyncClient() as http_client:
        async def fetch_for_stop(stop_gid: str) -> tuple[list[DepartureDelayEvent], bool]:
            async with semaphore:
                started = time.perf_counter()
                try:
                    payload = await vt_client.fetch_departures(http_client, stop_gid)
                    duration_ms = (time.perf_counter() - started) * 1000
                    record_poll_request(duration_ms=duration_ms, success=True, recorded_at=recorded_at)
                    return _extract_events(stop_gid, payload, recorded_at), True
                except Exception as exc:
                    duration_ms = (time.perf_counter() - started) * 1000
                    record_poll_request(duration_ms=duration_ms, success=False, recorded_at=recorded_at)
                    logger.warning("poll failed for stop %s: %s", stop_gid, exc)
                    return [], False

        result_sets = await asyncio.gather(*(fetch_for_stop(stop_gid) for stop_gid in TARGET_STOP_AREA_GIDS))

    events = [item for event_list, _ in result_sets for item in event_list]
    successful_stops = sum(1 for _, success in result_sets if success)
    failed_stops = len(result_sets) - successful_stops
    record_poll_cycle(successful_stops=successful_stops, failed_stops=failed_stops, recorded_at=recorded_at)

    async with pool.acquire() as conn:
        await insert_events(conn, events)

    logger.info("poll cycle complete: inserted %s events", len(events))
