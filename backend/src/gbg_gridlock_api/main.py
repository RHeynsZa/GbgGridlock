from __future__ import annotations

from fastapi import FastAPI, Query

from .config import Settings
from .database import Database
from .schemas import BottleneckStop, DelayDistributionBucket, WorstLine

settings = Settings()
db = Database(settings.database_url)
app = FastAPI(title="GbgGridlock API", version="0.1.0")


@app.on_event("startup")
async def on_startup() -> None:
    await db.connect()


@app.on_event("shutdown")
async def on_shutdown() -> None:
    await db.disconnect()


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/v1/delays/worst-lines", response_model=list[WorstLine])
async def get_worst_lines(window_minutes: int = Query(default=60, ge=5, le=10080), limit: int = Query(default=10, ge=1, le=50)) -> list[WorstLine]:
    sql = """
    SELECT line_number,
           AVG(delay_seconds)::float AS avg_delay_seconds,
           COUNT(*)::int AS sample_size
    FROM departure_delay_events
    WHERE recorded_at >= NOW() - ($1::int * INTERVAL '1 minute')
      AND delay_seconds IS NOT NULL
    GROUP BY line_number
    HAVING COUNT(*) > 5
    ORDER BY avg_delay_seconds DESC
    LIMIT $2
    """
    async with db.pool.acquire() as conn:
        rows = await conn.fetch(sql, window_minutes, limit)
    return [WorstLine(**dict(row)) for row in rows]


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
