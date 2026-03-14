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


@pytest.mark.anyio
async def test_worst_lines_endpoint_uses_query_params_and_returns_rows(monkeypatch):
    conn = FakeConn(
        rows=[
            {"line_number": "5", "avg_delay_seconds": 123.4, "sample_size": 7, "transport_mode": "tram"},
            {"line_number": "2", "avg_delay_seconds": 88.0, "sample_size": 9, "transport_mode": "bus"},
        ]
    )
    monkeypatch.setattr(main.db, "_pool", FakePool(conn))

    async with AsyncClient(transport=ASGITransport(app=main.app), base_url="http://test") as client:
        response = await client.get("/api/v1/delays/worst-lines", params={"window_minutes": 30, "limit": 2})

    assert response.status_code == 200
    assert response.json() == [
        {"line_number": "5", "avg_delay_seconds": 123.4, "sample_size": 7, "transport_mode": "tram"},
        {"line_number": "2", "avg_delay_seconds": 88.0, "sample_size": 9, "transport_mode": "bus"},
    ]
    assert len(conn.calls) == 1
    _, args = conn.calls[0]
    assert args == (30, 2)


@pytest.mark.anyio
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


@pytest.mark.anyio
async def test_line_metadata_endpoint_returns_cached_colors(monkeypatch):
    conn = FakeConn(
        rows=[
            {
                "line_number": "5",
                "foreground_color": "FFFFFF",
                "background_color": "FF0000",
                "text_color": None,
                "border_color": None,
                "transport_mode": "tram",
            },
            {
                "line_number": "11",
                "foreground_color": "000000",
                "background_color": "FFFF00",
                "text_color": "333333",
                "border_color": "CCCCCC",
                "transport_mode": "tram",
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
            "transport_mode": "tram",
        },
        {
            "line_number": "11",
            "foreground_color": "000000",
            "background_color": "FFFF00",
            "text_color": "333333",
            "border_color": "CCCCCC",
            "transport_mode": "tram",
        },
    ]
    assert len(main._line_metadata_cache) == 2
    assert main._line_metadata_cache_expiry is not None


@pytest.mark.anyio
async def test_delay_breakdown_by_stop_uses_stop_filter_when_provided(monkeypatch):
    conn = FakeConn(rows=[{"line_number": "16", "avg_delay_seconds": 111.1, "sample_size": 8, "transport_mode": "bus"}])
    monkeypatch.setattr(main.db, "_pool", FakePool(conn))

    async with AsyncClient(transport=ASGITransport(app=main.app), base_url="http://test") as client:
        response = await client.get("/api/v1/delays/by-stop", params={"window_minutes": 30, "stop_gid": "9021014001760000"})

    assert response.status_code == 200
    assert response.json() == [{"line_number": "16", "avg_delay_seconds": 111.1, "sample_size": 8, "transport_mode": "bus"}]
    assert len(conn.calls) == 1
    _, args = conn.calls[0]
    assert args == (30, "9021014001760000")


@pytest.mark.anyio
async def test_monitored_stops_endpoint_returns_human_readable_stop_names():
    async with AsyncClient(transport=ASGITransport(app=main.app), base_url="http://test") as client:
        response = await client.get("/api/v1/stops/monitored")

    assert response.status_code == 200
    assert response.json() == [
        {"stop_gid": "9021014001760000", "stop_name": "Centralstationen"},
        {"stop_gid": "9021014005650000", "stop_name": "Redbergsplatsen"},
        {"stop_gid": "9021014002510000", "stop_name": "Korsvägen"},
        {"stop_gid": "9021014003610000", "stop_name": "Järntorget"},
        {"stop_gid": "9021014004490000", "stop_name": "Marklandsgatan"},
        {"stop_gid": "9021014003100000", "stop_name": "Hjalmar Brantingsplatsen"},
    ]


@pytest.mark.anyio
async def test_cors_preflight_allows_github_pages_origin():
    async with AsyncClient(transport=ASGITransport(app=main.app), base_url="http://test") as client:
        response = await client.options(
            "/api/v1/delays/worst-lines",
            headers={
                "Origin": "https://rheynsza.github.io",
                "Access-Control-Request-Method": "GET",
            },
        )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "https://rheynsza.github.io"


@pytest.mark.anyio
async def test_debug_metrics_endpoint_returns_live_snapshot(monkeypatch):
    monkeypatch.setattr(
        main,
        "get_snapshot",
        lambda monitored_stops_count: {
            "window_minutes": 5,
            "monitored_stops_count": monitored_stops_count,
            "poll_requests_count_5m": 30,
            "successful_poll_requests_count_5m": 27,
            "average_api_response_time_ms_5m": 412.8,
            "success_rate_percent_5m": 90.0,
            "poll_cycles_count_5m": 5,
            "successful_stop_polls_count_5m": 27,
            "failed_stop_polls_count_5m": 3,
        },
    )

    async with AsyncClient(transport=ASGITransport(app=main.app), base_url="http://test") as client:
        response = await client.get("/api/v1/debug/metrics")

    assert response.status_code == 200
    assert response.json() == {
        "window_minutes": 5,
        "monitored_stops_count": 6,
        "poll_requests_count_5m": 30,
        "successful_poll_requests_count_5m": 27,
        "average_api_response_time_ms_5m": 412.8,
        "success_rate_percent_5m": 90.0,
        "poll_cycles_count_5m": 5,
        "successful_stop_polls_count_5m": 27,
        "failed_stop_polls_count_5m": 3,
    }
