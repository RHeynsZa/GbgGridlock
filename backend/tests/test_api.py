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
                "stop_gid": "9021014001950000",
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
            "stop_gid": "9021014001950000",
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
        response = await client.get("/api/v1/delays/by-stop", params={"window_minutes": 30, "stop_gid": "9021014001950000"})

    assert response.status_code == 200
    assert response.json() == [{"line_number": "16", "avg_delay_seconds": 111.1, "sample_size": 8, "transport_mode": "bus"}]
    assert len(conn.calls) == 1
    _, args = conn.calls[0]
    assert args == (30, "9021014001950000")


@pytest.mark.anyio
async def test_monitored_stops_endpoint_returns_human_readable_stop_names():
    async with AsyncClient(transport=ASGITransport(app=main.app), base_url="http://test") as client:
        response = await client.get("/api/v1/stops/monitored")

    assert response.status_code == 200
    assert response.json() == [
        {"stop_gid": "9021014001950000", "stop_name": "Centralstationen"},
        {"stop_gid": "9021014005650000", "stop_name": "Redbergsplatsen"},
        {"stop_gid": "9021014003980000", "stop_name": "Korsvägen"},
        {"stop_gid": "9021014003640000", "stop_name": "Järntorget"},
        {"stop_gid": "9021014004760000", "stop_name": "Marklandsgatan"},
        {"stop_gid": "9021014003180000", "stop_name": "Hjalmar Brantingsplatsen"},
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


@pytest.mark.anyio
async def test_network_stats_endpoint_returns_aggregated_metrics(monkeypatch):
    class FakeConnRow:
        def __init__(self, rows):
            self.rows = rows
            self.calls = []

        async def fetchrow(self, sql: str, *args):
            self.calls.append((sql, args))
            return self.rows[0] if self.rows else None

    conn = FakeConnRow(
        rows=[
            {
                "avg_delay_seconds": 85.5,
                "reliability_percent": 72.3,
                "cancellation_rate_percent": 1.8,
                "p95_delay_seconds": 245.0,
                "sample_size": 523,
            }
        ]
    )
    monkeypatch.setattr(main.db, "_pool", FakePool(conn))

    async with AsyncClient(transport=ASGITransport(app=main.app), base_url="http://test") as client:
        response = await client.get("/api/v1/stats/network", params={"window_minutes": 120})

    assert response.status_code == 200
    assert response.json() == {
        "avg_delay_seconds": 85.5,
        "reliability_percent": 72.3,
        "cancellation_rate_percent": 1.8,
        "p95_delay_seconds": 245.0,
        "sample_size": 523,
    }
    assert len(conn.calls) == 1
    _, args = conn.calls[0]
    assert args == (120,)


@pytest.mark.anyio
async def test_hourly_trend_endpoint_returns_time_series_by_mode(monkeypatch):
    from datetime import datetime, timezone
    
    conn = FakeConn(
        rows=[
            {"hour": datetime(2026, 3, 14, 8, 0, tzinfo=timezone.utc), "tram": 45.2, "bus": 62.1, "ferry": 12.0},
            {"hour": datetime(2026, 3, 14, 9, 0, tzinfo=timezone.utc), "tram": 78.5, "bus": 91.3, "ferry": 8.5},
        ]
    )
    monkeypatch.setattr(main.db, "_pool", FakePool(conn))

    async with AsyncClient(transport=ASGITransport(app=main.app), base_url="http://test") as client:
        response = await client.get("/api/v1/stats/hourly-trend", params={"window_hours": 12})

    assert response.status_code == 200
    assert response.json() == [
        {"hour": "2026-03-14T08:00:00Z", "tram": 45.2, "bus": 62.1, "ferry": 12.0},
        {"hour": "2026-03-14T09:00:00Z", "tram": 78.5, "bus": 91.3, "ferry": 8.5},
    ]
    assert len(conn.calls) == 1
    _, args = conn.calls[0]
    assert args == (12,)


@pytest.mark.anyio
async def test_line_details_endpoint_returns_comprehensive_metrics_per_line(monkeypatch):
    conn = FakeConn(
        rows=[
            {
                "line_number": "5",
                "transport_mode": "tram",
                "avg_delay_seconds": 95.2,
                "on_time_rate_percent": 68.5,
                "canceled_trips": 3,
                "sample_size": 156,
            },
            {
                "line_number": "16",
                "transport_mode": "bus",
                "avg_delay_seconds": 112.7,
                "on_time_rate_percent": 55.1,
                "canceled_trips": 7,
                "sample_size": 203,
            },
        ]
    )
    monkeypatch.setattr(main.db, "_pool", FakePool(conn))

    async with AsyncClient(transport=ASGITransport(app=main.app), base_url="http://test") as client:
        response = await client.get("/api/v1/lines/details", params={"window_minutes": 180})

    assert response.status_code == 200
    assert response.json() == [
        {
            "line_number": "5",
            "transport_mode": "tram",
            "avg_delay_seconds": 95.2,
            "on_time_rate_percent": 68.5,
            "canceled_trips": 3,
            "sample_size": 156,
        },
        {
            "line_number": "16",
            "transport_mode": "bus",
            "avg_delay_seconds": 112.7,
            "on_time_rate_percent": 55.1,
            "canceled_trips": 7,
            "sample_size": 203,
        },
    ]
    assert len(conn.calls) == 1
    _, args = conn.calls[0]
    assert args == (180,)


@pytest.mark.anyio
async def test_delay_distribution_endpoint_returns_bucketed_delays(monkeypatch):
    conn = FakeConn(
        rows=[
            {"bucket_seconds": 0, "departures": 145},
            {"bucket_seconds": 60, "departures": 82},
            {"bucket_seconds": 120, "departures": 34},
            {"bucket_seconds": 180, "departures": 18},
            {"bucket_seconds": 240, "departures": 9},
        ]
    )
    monkeypatch.setattr(main.db, "_pool", FakePool(conn))

    async with AsyncClient(transport=ASGITransport(app=main.app), base_url="http://test") as client:
        response = await client.get("/api/v1/delays/distribution/5", params={"window_minutes": 360})

    assert response.status_code == 200
    assert response.json() == [
        {"bucket_seconds": 0, "departures": 145},
        {"bucket_seconds": 60, "departures": 82},
        {"bucket_seconds": 120, "departures": 34},
        {"bucket_seconds": 180, "departures": 18},
        {"bucket_seconds": 240, "departures": 9},
    ]
    assert len(conn.calls) == 1
    _, args = conn.calls[0]
    assert args == ("5", 360)


@pytest.mark.anyio
async def test_transport_mode_exposed_in_worst_lines_endpoint_for_all_modes(monkeypatch):
    """Test that transport_mode is properly exposed for tram, bus, and ferry."""
    conn = FakeConn(
        rows=[
            {"line_number": "5", "avg_delay_seconds": 120.5, "sample_size": 15, "transport_mode": "tram"},
            {"line_number": "16", "avg_delay_seconds": 105.2, "sample_size": 12, "transport_mode": "bus"},
            {"line_number": "285", "avg_delay_seconds": 95.8, "sample_size": 8, "transport_mode": "ferry"},
            {"line_number": "286", "avg_delay_seconds": 88.3, "sample_size": 6, "transport_mode": "boat"},
        ]
    )
    monkeypatch.setattr(main.db, "_pool", FakePool(conn))

    async with AsyncClient(transport=ASGITransport(app=main.app), base_url="http://test") as client:
        response = await client.get("/api/v1/delays/worst-lines", params={"window_minutes": 60, "limit": 50})

    assert response.status_code == 200
    data = response.json()
    
    assert len(data) == 4
    assert data[0]["transport_mode"] == "tram"
    assert data[1]["transport_mode"] == "bus"
    assert data[2]["transport_mode"] == "ferry"
    assert data[3]["transport_mode"] == "boat"
    
    assert data[2]["line_number"] == "285"
    assert data[3]["line_number"] == "286"


@pytest.mark.anyio
async def test_transport_mode_exposed_in_line_details_endpoint(monkeypatch):
    """Test that transport_mode is properly exposed in line details including ferry."""
    conn = FakeConn(
        rows=[
            {
                "line_number": "7",
                "transport_mode": "tram",
                "avg_delay_seconds": 85.2,
                "on_time_rate_percent": 72.5,
                "canceled_trips": 2,
                "sample_size": 120,
            },
            {
                "line_number": "18",
                "transport_mode": "bus",
                "avg_delay_seconds": 98.7,
                "on_time_rate_percent": 65.3,
                "canceled_trips": 4,
                "sample_size": 150,
            },
            {
                "line_number": "285",
                "transport_mode": "ferry",
                "avg_delay_seconds": 62.1,
                "on_time_rate_percent": 88.2,
                "canceled_trips": 1,
                "sample_size": 45,
            },
        ]
    )
    monkeypatch.setattr(main.db, "_pool", FakePool(conn))

    async with AsyncClient(transport=ASGITransport(app=main.app), base_url="http://test") as client:
        response = await client.get("/api/v1/lines/details", params={"window_minutes": 60})

    assert response.status_code == 200
    data = response.json()
    
    assert len(data) == 3
    
    tram_line = next(line for line in data if line["line_number"] == "7")
    assert tram_line["transport_mode"] == "tram"
    
    bus_line = next(line for line in data if line["line_number"] == "18")
    assert bus_line["transport_mode"] == "bus"
    
    ferry_line = next(line for line in data if line["line_number"] == "285")
    assert ferry_line["transport_mode"] == "ferry"
    assert ferry_line["avg_delay_seconds"] == 62.1


@pytest.mark.anyio
async def test_transport_mode_exposed_in_line_metadata_endpoint(monkeypatch):
    """Test that transport_mode is properly exposed in line metadata for all modes."""
    conn = FakeConn(
        rows=[
            {
                "line_number": "10",
                "foreground_color": "006c93",
                "background_color": "d8e8b0",
                "text_color": None,
                "border_color": "d8e8b0",
                "transport_mode": "tram",
            },
            {
                "line_number": "55",
                "foreground_color": "ffffff",
                "background_color": "0072B2",
                "text_color": None,
                "border_color": "0072B2",
                "transport_mode": "bus",
            },
            {
                "line_number": "286",
                "foreground_color": "ffffff",
                "background_color": "264653",
                "text_color": None,
                "border_color": "264653",
                "transport_mode": "ferry",
            },
        ]
    )
    monkeypatch.setattr(main.db, "_pool", FakePool(conn))
    main._line_metadata_cache = []
    main._line_metadata_cache_expiry = None

    async with AsyncClient(transport=ASGITransport(app=main.app), base_url="http://test") as client:
        response = await client.get("/api/v1/lines/metadata")

    assert response.status_code == 200
    data = response.json()
    
    assert len(data) == 3
    
    tram_metadata = next(line for line in data if line["line_number"] == "10")
    assert tram_metadata["transport_mode"] == "tram"
    
    bus_metadata = next(line for line in data if line["line_number"] == "55")
    assert bus_metadata["transport_mode"] == "bus"
    
    ferry_metadata = next(line for line in data if line["line_number"] == "286")
    assert ferry_metadata["transport_mode"] == "ferry"


@pytest.mark.anyio
async def test_transport_mode_null_handling_in_api_responses(monkeypatch):
    """Test that null transport_mode values are properly handled in API responses."""
    conn = FakeConn(
        rows=[
            {"line_number": "UNKNOWN", "avg_delay_seconds": 75.0, "sample_size": 10, "transport_mode": None},
            {"line_number": "5", "avg_delay_seconds": 90.5, "sample_size": 15, "transport_mode": "tram"},
        ]
    )
    monkeypatch.setattr(main.db, "_pool", FakePool(conn))

    async with AsyncClient(transport=ASGITransport(app=main.app), base_url="http://test") as client:
        response = await client.get("/api/v1/delays/worst-lines", params={"window_minutes": 60})

    assert response.status_code == 200
    data = response.json()
    
    assert len(data) == 2
    assert data[0]["transport_mode"] is None
    assert data[1]["transport_mode"] == "tram"
