from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from .config import Settings
from .database import Database
from .debug_metrics import get_snapshot
from .monitored_stops import MONITORED_STOPS
from .schemas import BottleneckStop, DebugMetrics, DelayDistributionBucket, HourlyTrendPoint, LineDetail, LineMetadata, MonitoredStop, NetworkStats, WorstLine
from .vasttrafik_client import VasttrafikClient
from .worker import fetch_line_metadata_once, run_poll_cycle

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = Settings()
db = Database(settings.database_url)

_line_metadata_cache: list[LineMetadata] = []
_line_metadata_cache_expiry: datetime | None = None
LINE_METADATA_CACHE_TTL_SECONDS = 300

scheduler: AsyncIOScheduler | None = None
vt_client: VasttrafikClient | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global scheduler, vt_client
    
    await db.connect()
    logger.info("Database connection established")
    
    if settings.enable_worker:
        if not settings.vt_client_id or not settings.vt_client_secret:
            logger.error("Worker enabled but VT_CLIENT_ID or VT_CLIENT_SECRET not set")
        else:
            vt_client = VasttrafikClient(
                token_url=settings.vt_token_url,
                api_base_url=settings.vt_api_base_url,
                client_id=settings.vt_client_id,
                client_secret=settings.vt_client_secret,
                auth_key=settings.vt_auth_key,
            )
            
            await fetch_line_metadata_once(db.pool, vt_client, settings.worker_http_concurrency)
            
            scheduler = AsyncIOScheduler()
            scheduler.add_job(
                run_poll_cycle,
                "interval",
                seconds=settings.worker_interval_seconds,
                args=[db.pool, vt_client, settings.worker_http_concurrency],
            )
            
            await run_poll_cycle(db.pool, vt_client, settings.worker_http_concurrency)
            scheduler.start()
            logger.info("Worker scheduler started at %s second interval", settings.worker_interval_seconds)
    else:
        logger.info("Worker disabled (ENABLE_WORKER not set to true)")
    
    yield
    
    if scheduler:
        scheduler.shutdown(wait=False)
        logger.info("Worker scheduler shut down")
    
    await db.disconnect()
    logger.info("Database connection closed")


app = FastAPI(title="GbgGridlock API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/v1/delays/worst-lines", response_model=list[WorstLine])
async def get_worst_lines(window_minutes: int = Query(default=60, ge=5, le=10080), limit: int = Query(default=10, ge=1, le=50)) -> list[WorstLine]:
    sql = """
    SELECT e.line_number,
           AVG(e.delay_seconds)::float AS avg_delay_seconds,
           COUNT(*)::int AS sample_size,
           m.transport_mode
    FROM departure_delay_events e
    LEFT JOIN line_metadata m ON e.line_number = m.line_number
    WHERE e.recorded_at >= NOW() - ($1::int * INTERVAL '1 minute')
      AND e.delay_seconds IS NOT NULL
    GROUP BY e.line_number, m.transport_mode
    HAVING COUNT(*) > 5
    ORDER BY avg_delay_seconds DESC
    LIMIT $2
    """
    async with db.pool.acquire() as conn:
        rows = await conn.fetch(sql, window_minutes, limit)
    return [WorstLine(**dict(row)) for row in rows]


@app.get("/api/v1/delays/by-stop", response_model=list[WorstLine])
async def get_delay_breakdown_by_stop(
    window_minutes: int = Query(default=60, ge=5, le=10080),
    stop_gid: str | None = Query(default=None),
) -> list[WorstLine]:
    if stop_gid:
        stop_filter = "AND e.stop_gid = $2"
        params: tuple[object, ...] = (window_minutes, stop_gid)
    else:
        stop_filter = ""
        params = (window_minutes,)

    sql = f"""
    SELECT e.line_number,
           AVG(e.delay_seconds)::float AS avg_delay_seconds,
           COUNT(*)::int AS sample_size,
           m.transport_mode
    FROM departure_delay_events e
    LEFT JOIN line_metadata m ON e.line_number = m.line_number
    WHERE e.recorded_at >= NOW() - ($1::int * INTERVAL '1 minute')
      AND e.delay_seconds IS NOT NULL
      {stop_filter}
    GROUP BY e.line_number, m.transport_mode
    HAVING COUNT(*) > 5
    ORDER BY avg_delay_seconds DESC
    """

    async with db.pool.acquire() as conn:
        rows = await conn.fetch(sql, *params)

    return [WorstLine(**dict(row)) for row in rows]


@app.get("/api/v1/stops/monitored", response_model=list[MonitoredStop])
async def get_monitored_stops() -> list[MonitoredStop]:
    return [MonitoredStop(stop_gid=stop.stop_gid, stop_name=stop.stop_name) for stop in MONITORED_STOPS]


@app.get("/api/v1/delays/distribution/{line_number}", response_model=list[DelayDistributionBucket])
async def get_delay_distribution(line_number: str, window_minutes: int = Query(default=1440, ge=5, le=10080)) -> list[DelayDistributionBucket]:
    sql = """
    SELECT (FLOOR(delay_seconds / 60.0) * 60)::int AS bucket_seconds,
           COUNT(*)::int AS departures
    FROM departure_delay_events
    WHERE line_number = $1
      AND recorded_at >= NOW() - ($2::int * INTERVAL '1 minute')
      AND delay_seconds IS NOT NULL
    GROUP BY bucket_seconds
    ORDER BY bucket_seconds ASC
    """
    async with db.pool.acquire() as conn:
        rows = await conn.fetch(sql, line_number, window_minutes)
    return [DelayDistributionBucket(**dict(row)) for row in rows]


@app.get("/api/v1/stops/bottlenecks", response_model=list[BottleneckStop])
async def get_bottlenecks(window_minutes: int = Query(default=1440, ge=5, le=10080), limit: int = Query(default=10, ge=1, le=50)) -> list[BottleneckStop]:
    sql = """
    SELECT stop_gid,
           COUNT(*) FILTER (WHERE is_cancelled OR delay_seconds >= 300)::int AS severe_or_cancelled_count,
           COUNT(*)::int AS total_departures
    FROM departure_delay_events
    WHERE recorded_at >= NOW() - ($1::int * INTERVAL '1 minute')
    GROUP BY stop_gid
    ORDER BY severe_or_cancelled_count DESC
    LIMIT $2
    """
    async with db.pool.acquire() as conn:
        rows = await conn.fetch(sql, window_minutes, limit)
    return [BottleneckStop(**dict(row)) for row in rows]


@app.get("/api/v1/lines/metadata", response_model=list[LineMetadata])
async def get_line_metadata() -> list[LineMetadata]:
    global _line_metadata_cache, _line_metadata_cache_expiry

    now = datetime.now(timezone.utc)
    if _line_metadata_cache_expiry and now < _line_metadata_cache_expiry:
        return _line_metadata_cache

    sql = """
    SELECT line_number,
           foreground_color,
           background_color,
           text_color,
           border_color,
           transport_mode
    FROM line_metadata
    ORDER BY line_number
    """
    async with db.pool.acquire() as conn:
        rows = await conn.fetch(sql)

    _line_metadata_cache = [LineMetadata(**dict(row)) for row in rows]
    _line_metadata_cache_expiry = now + timedelta(seconds=LINE_METADATA_CACHE_TTL_SECONDS)

    return _line_metadata_cache


@app.get("/api/v1/stats/network", response_model=NetworkStats)
async def get_network_stats(window_minutes: int = Query(default=60, ge=5, le=10080)) -> NetworkStats:
    sql = """
    WITH stats AS (
        SELECT 
            AVG(delay_seconds) AS avg_delay,
            PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY delay_seconds) AS p95_delay,
            COUNT(*) AS total_departures,
            COUNT(*) FILTER (WHERE is_cancelled) AS cancelled_departures,
            COUNT(*) FILTER (WHERE delay_seconds IS NOT NULL AND delay_seconds <= 300) AS on_time_departures
        FROM departure_delay_events
        WHERE recorded_at >= NOW() - ($1::int * INTERVAL '1 minute')
          AND delay_seconds IS NOT NULL
    )
    SELECT 
        COALESCE(avg_delay, 0)::float AS avg_delay_seconds,
        CASE 
            WHEN total_departures > 0 
            THEN (on_time_departures::float / total_departures * 100)
            ELSE 0 
        END AS reliability_percent,
        CASE 
            WHEN total_departures > 0 
            THEN (cancelled_departures::float / total_departures * 100)
            ELSE 0 
        END AS cancellation_rate_percent,
        COALESCE(p95_delay, 0)::float AS p95_delay_seconds,
        total_departures::int AS sample_size
    FROM stats
    """
    async with db.pool.acquire() as conn:
        row = await conn.fetchrow(sql, window_minutes)
    
    if not row:
        return NetworkStats(
            avg_delay_seconds=0.0,
            reliability_percent=0.0,
            cancellation_rate_percent=0.0,
            p95_delay_seconds=0.0,
            sample_size=0
        )
    
    return NetworkStats(**dict(row))


@app.get("/api/v1/stats/hourly-trend", response_model=list[HourlyTrendPoint])
async def get_hourly_trend(window_hours: int = Query(default=24, ge=1, le=168)) -> list[HourlyTrendPoint]:
    sql = """
    WITH hourly_data AS (
        SELECT 
            DATE_TRUNC('hour', recorded_at) AS hour_timestamp,
            m.transport_mode,
            AVG(delay_seconds) AS avg_delay
        FROM departure_delay_events e
        LEFT JOIN line_metadata m ON e.line_number = m.line_number
        WHERE e.recorded_at >= NOW() - ($1::int * INTERVAL '1 hour')
          AND e.delay_seconds IS NOT NULL
        GROUP BY DATE_TRUNC('hour', recorded_at), m.transport_mode
    )
    SELECT 
        hour_timestamp AS hour,
        COALESCE(MAX(CASE WHEN LOWER(transport_mode) = 'tram' THEN avg_delay END), 0)::float AS tram,
        COALESCE(MAX(CASE WHEN LOWER(transport_mode) = 'bus' THEN avg_delay END), 0)::float AS bus,
        COALESCE(MAX(CASE WHEN LOWER(transport_mode) IN ('ferry', 'boat') THEN avg_delay END), 0)::float AS ferry
    FROM hourly_data
    GROUP BY hour_timestamp
    ORDER BY hour_timestamp ASC
    """
    async with db.pool.acquire() as conn:
        rows = await conn.fetch(sql, window_hours)
    return [HourlyTrendPoint(**dict(row)) for row in rows]


@app.get("/api/v1/lines/details", response_model=list[LineDetail])
async def get_line_details(window_minutes: int = Query(default=60, ge=5, le=10080)) -> list[LineDetail]:
    sql = """
    SELECT 
        e.line_number,
        m.transport_mode,
        AVG(e.delay_seconds)::float AS avg_delay_seconds,
        CASE 
            WHEN COUNT(*) > 0 
            THEN (COUNT(*) FILTER (WHERE e.delay_seconds <= 300)::float / COUNT(*) * 100)
            ELSE 0 
        END AS on_time_rate_percent,
        COUNT(*) FILTER (WHERE e.is_cancelled)::int AS canceled_trips,
        COUNT(*)::int AS sample_size
    FROM departure_delay_events e
    LEFT JOIN line_metadata m ON e.line_number = m.line_number
    WHERE e.recorded_at >= NOW() - ($1::int * INTERVAL '1 minute')
      AND e.delay_seconds IS NOT NULL
    GROUP BY e.line_number, m.transport_mode
    HAVING COUNT(*) > 5
    ORDER BY e.line_number
    """
    async with db.pool.acquire() as conn:
        rows = await conn.fetch(sql, window_minutes)
    return [LineDetail(**dict(row)) for row in rows]


@app.get("/api/v1/debug/metrics", response_model=DebugMetrics)
async def get_debug_metrics() -> DebugMetrics:
    snapshot = get_snapshot(monitored_stops_count=len(MONITORED_STOPS))
    return DebugMetrics(**snapshot)
