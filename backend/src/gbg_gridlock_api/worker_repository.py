from __future__ import annotations

from typing import Iterable

import asyncpg

from .worker_models import DepartureDelayEvent, LineMetadata


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

UPSERT_LINE_METADATA_SQL = """
INSERT INTO line_metadata (
  line_number,
  foreground_color,
  background_color,
  text_color,
  border_color,
  last_seen_at,
  updated_at
)
VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
ON CONFLICT (line_number) DO UPDATE SET
  foreground_color = COALESCE(EXCLUDED.foreground_color, line_metadata.foreground_color),
  background_color = COALESCE(EXCLUDED.background_color, line_metadata.background_color),
  text_color = COALESCE(EXCLUDED.text_color, line_metadata.text_color),
  border_color = COALESCE(EXCLUDED.border_color, line_metadata.border_color),
  last_seen_at = NOW(),
  updated_at = CASE
    WHEN COALESCE(EXCLUDED.foreground_color, EXCLUDED.background_color, EXCLUDED.text_color, EXCLUDED.border_color) IS NOT NULL
    THEN NOW()
    ELSE line_metadata.updated_at
  END
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


async def upsert_line_metadata(conn: asyncpg.Connection, lines: Iterable[LineMetadata]) -> None:
    rows = [
        (
            line.line_number,
            line.foreground_color,
            line.background_color,
            line.text_color,
            line.border_color,
        )
        for line in lines
    ]

    if rows:
        await conn.executemany(UPSERT_LINE_METADATA_SQL, rows)
