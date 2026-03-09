from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime, timezone
from types import SimpleNamespace

import pytest

from gbg_gridlock_worker import main


def test_extract_events_maps_departure_fields_and_skips_missing_planned_time():
    recorded_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
    payload = {
        "results": [
            {
                "serviceJourney": {"gid": "j-1", "line": {"shortName": "5"}},
                "plannedTime": "2026-01-01T10:00:00Z",
                "estimatedTime": "2026-01-01T10:02:30Z",
                "isCancelled": False,
            },
            {
                "journey": {"gid": "j-2"},
                "line": {"name": "Blue"},
                "scheduledTime": "2026-01-01T10:10:00Z",
                "isCancelled": True,
            },
            {"line": {"shortName": "skip-me"}},
        ]
    }

    events = main._extract_events("stop-a", payload, recorded_at)

    assert len(events) == 2
    assert events[0].journey_gid == "j-1"
    assert events[0].line_number == "5"
    assert events[0].delay_seconds == 150
    assert events[0].realtime_missing is False
    assert events[1].journey_gid == "j-2"
    assert events[1].line_number == "Blue"
    assert events[1].delay_seconds is None
    assert events[1].realtime_missing is True
    assert events[1].is_cancelled is True


class FakeClient:
    async def fetch_departures(self, _http_client, stop_gid: str):
        return {
            "results": [
                {
                    "serviceJourney": {"gid": f"journey-{stop_gid}", "line": {"shortName": "3"}},
                    "plannedTime": "2026-01-01T10:00:00Z",
                    "estimatedTime": "2026-01-01T10:01:00Z",
                }
            ]
        }


class FakeConn:
    pass


class FakePool:
    def __init__(self):
        self.conn = FakeConn()

    @asynccontextmanager
    async def acquire(self):
        yield self.conn


@pytest.mark.asyncio
async def test_run_poll_cycle_fetches_all_stops_and_inserts_events(monkeypatch):
    captured = {}

    async def fake_insert_events(conn, events):
        captured["conn"] = conn
        captured["events"] = list(events)

    monkeypatch.setattr(main, "insert_events", fake_insert_events)
    monkeypatch.setattr(main, "TARGET_STOP_AREA_GIDS", ["stop-1", "stop-2"])

    settings = SimpleNamespace(http_concurrency=2)
    pool = FakePool()

    await main.run_poll_cycle(settings=settings, pool=pool, vt_client=FakeClient())

    assert captured["conn"] is pool.conn
    assert len(captured["events"]) == 2
    assert {event.stop_gid for event in captured["events"]} == {"stop-1", "stop-2"}
    assert all(event.delay_seconds == 60 for event in captured["events"])
