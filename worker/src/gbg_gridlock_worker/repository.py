from __future__ import annotations

from typing import Iterable

import asyncpg

from .models import DepartureDelayEvent


INSERT_SQL = """
INSERT INTO departure_delay_events (
  recorded_at,
  stop_gid,
  journey_gid,
  line_number,
  planned_time,
  estimated_time,
  delay_seconds,
  is_cancelled,
  realtime_missing
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
ON CONFLICT (recorded_at, stop_gid, journey_gid) DO NOTHING
"""


async def insert_events(conn: asyncpg.Connection, events: Iterable[DepartureDelayEvent]) -> None:
    rows = [
        (
            event.recorded_at,
            event.stop_gid,
            event.journey_gid,
            event.line_number,
            event.planned_time,
            event.estimated_time,
            event.delay_seconds,
            event.is_cancelled,
            event.realtime_missing,
        )
        for event in events
    ]

    if rows:
        await conn.executemany(INSERT_SQL, rows)
