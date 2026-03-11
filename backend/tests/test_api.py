from __future__ import annotations

from contextlib import asynccontextmanager

import pytest
from httpx import ASGITransport, AsyncClient

from gbg_gridlock_api import main


class FakeConn:
    def __init__(self, rows):
        self.rows = rows
        self.calls = []

    async def fetch(self, sql: str, *args):
        self.calls.append((sql, args))
        return self.rows


class FakePool:
    def __init__(self, conn: FakeConn):
        self.conn = conn

    @asynccontextmanager
    async def acquire(self):
        yield self.conn


@pytest.mark.asyncio
async def test_worst_lines_endpoint_uses_query_params_and_returns_rows(monkeypatch):
    conn = FakeConn(
        rows=[
            {"line_number": "5", "avg_delay_seconds": 123.4, "sample_size": 7},
            {"line_number": "2", "avg_delay_seconds": 88.0, "sample_size": 9},
        ]
    )
    monkeypatch.setattr(main.db, "_pool", FakePool(conn))

    async with AsyncClient(transport=ASGITransport(app=main.app), base_url="http://test") as client:
        response = await client.get("/api/v1/delays/worst-lines", params={"window_minutes": 30, "limit": 2})

    assert response.status_code == 200
    assert response.json() == [
        {"line_number": "5", "avg_delay_seconds": 123.4, "sample_size": 7},
        {"line_number": "2", "avg_delay_seconds": 88.0, "sample_size": 9},
    ]
    assert len(conn.calls) == 1
    _, args = conn.calls[0]
    assert args == (30, 2)


@pytest.mark.asyncio
async def test_bottlenecks_endpoint_returns_schema_payload(monkeypatch):
    conn = FakeConn(
        rows=[
            {
                "stop_gid": "9021014001760000",
                "severe_or_cancelled_count": 12,
                "total_departures": 34,
            }
        ]
    )
    monkeypatch.setattr(main.db, "_pool", FakePool(conn))

    async with AsyncClient(transport=ASGITransport(app=main.app), base_url="http://test") as client:
        response = await client.get("/api/v1/stops/bottlenecks")

    assert response.status_code == 200
    assert response.json() == [
        {
            "stop_gid": "9021014001760000",
            "severe_or_cancelled_count": 12,
            "total_departures": 34,
        }
    ]


@pytest.mark.asyncio
async def test_line_metadata_endpoint_returns_cached_colors(monkeypatch):
    conn = FakeConn(
        rows=[
            {
                "line_number": "5",
                "foreground_color": "FFFFFF",
                "background_color": "FF0000",
                "text_color": None,
                "border_color": None,
            },
            {
                "line_number": "11",
                "foreground_color": "000000",
                "background_color": "FFFF00",
                "text_color": "333333",
                "border_color": "CCCCCC",
            },
        ]
    )
    monkeypatch.setattr(main.db, "_pool", FakePool(conn))
    main._line_metadata_cache = []
    main._line_metadata_cache_expiry = None

    async with AsyncClient(transport=ASGITransport(app=main.app), base_url="http://test") as client:
        response = await client.get("/api/v1/lines/metadata")

    assert response.status_code == 200
    assert response.json() == [
        {
            "line_number": "5",
            "foreground_color": "FFFFFF",
            "background_color": "FF0000",
            "text_color": None,
            "border_color": None,
        },
        {
            "line_number": "11",
            "foreground_color": "000000",
            "background_color": "FFFF00",
            "text_color": "333333",
            "border_color": "CCCCCC",
        },
    ]
    assert len(main._line_metadata_cache) == 2
    assert main._line_metadata_cache_expiry is not None
