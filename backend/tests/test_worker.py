from __future__ import annotations

from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, Mock
import pytest

from gbg_gridlock_api.worker import (
    _infer_transport_mode_from_line_number,
    _transport_mode,
    _parse_iso,
    _extract_events,
    _extract_line_metadata,
    run_poll_cycle,
    fetch_line_metadata_once,
)
from gbg_gridlock_api.worker_models import DepartureDelayEvent, LineMetadata


class TestTransportModeInference:
    """Tests for transport mode inference and extraction logic."""

    def test_infer_transport_mode_from_line_number_tram(self):
        """Lines 1-13 should be inferred as tram."""
        assert _infer_transport_mode_from_line_number("1") == "tram"
        assert _infer_transport_mode_from_line_number("5") == "tram"
        assert _infer_transport_mode_from_line_number("13") == "tram"
        assert _infer_transport_mode_from_line_number("  11  ") == "tram"

    def test_infer_transport_mode_from_line_number_ferry(self):
        """Lines starting with 2 should be inferred as ferry."""
        assert _infer_transport_mode_from_line_number("285") == "ferry"
        assert _infer_transport_mode_from_line_number("286") == "ferry"
        assert _infer_transport_mode_from_line_number("2") == "ferry"

    def test_infer_transport_mode_from_line_number_bus(self):
        """All other lines should be inferred as bus."""
        assert _infer_transport_mode_from_line_number("16") == "bus"
        assert _infer_transport_mode_from_line_number("55") == "bus"
        assert _infer_transport_mode_from_line_number("X4") == "bus"
        assert _infer_transport_mode_from_line_number("EXPRESS") == "bus"
        assert _infer_transport_mode_from_line_number("0") == "bus"
        assert _infer_transport_mode_from_line_number("14") == "bus"

    def test_transport_mode_from_service_journey_line(self):
        """Extract transport mode from serviceJourney.line.transportMode."""
        dep = {
            "serviceJourney": {
                "line": {"transportMode": "TRAM"}
            }
        }
        assert _transport_mode(dep) == "tram"

    def test_transport_mode_from_line_object(self):
        """Extract transport mode from line.transportMode."""
        dep = {"line": {"transportMode": "BUS"}}
        assert _transport_mode(dep) == "bus"

    def test_transport_mode_from_dep_level(self):
        """Extract transport mode from dep.transportMode."""
        dep = {"transportMode": "ferry"}
        assert _transport_mode(dep) == "ferry"

    def test_transport_mode_uses_fallback_when_missing(self):
        """Use fallback heuristic when API doesn't provide transportMode."""
        dep = {"line": {"shortName": "5"}}
        assert _transport_mode(dep, "5") == "tram"

        dep = {"line": {"shortName": "16"}}
        assert _transport_mode(dep, "16") == "bus"

    def test_transport_mode_prefers_api_over_fallback(self):
        """API-provided transport mode takes precedence over heuristic."""
        dep = {
            "line": {"transportMode": "BUS", "shortName": "5"}
        }
        assert _transport_mode(dep, "5") == "bus"

    def test_transport_mode_normalizes_to_lowercase(self):
        """Transport mode should be normalized to lowercase."""
        assert _transport_mode({"transportMode": "TRAM"}) == "tram"
        assert _transport_mode({"transportMode": "Bus"}) == "bus"
        assert _transport_mode({"transportMode": "FERRY"}) == "ferry"


class TestTimestampParsing:
    """Tests for ISO timestamp parsing."""

    def test_parse_iso_with_z_suffix(self):
        """Parse ISO timestamp with Z suffix."""
        result = _parse_iso("2026-03-15T10:30:00Z")
        assert result == datetime(2026, 3, 15, 10, 30, 0, tzinfo=timezone.utc)

    def test_parse_iso_with_timezone_offset(self):
        """Parse ISO timestamp with timezone offset."""
        result = _parse_iso("2026-03-15T11:30:00+01:00")
        expected = datetime(2026, 3, 15, 10, 30, 0, tzinfo=timezone.utc)
        assert result == expected

    def test_parse_iso_none_input(self):
        """Return None for None input."""
        assert _parse_iso(None) is None

    def test_parse_iso_empty_string(self):
        """Return None for empty string."""
        assert _parse_iso("") is None


class TestEventExtraction:
    """Tests for departure event extraction logic."""

    def test_extract_events_basic_departure(self):
        """Extract a basic departure event with all fields."""
        payload = {
            "results": [
                {
                    "serviceJourney": {
                        "gid": "9015014500600123",
                        "line": {
                            "shortName": "5",
                            "transportMode": "tram"
                        }
                    },
                    "plannedTime": "2026-03-15T10:00:00Z",
                    "estimatedTime": "2026-03-15T10:02:30Z",
                    "isCancelled": False
                }
            ]
        }
        recorded_at = datetime(2026, 3, 15, 9, 55, tzinfo=timezone.utc)
        
        events = _extract_events("9021014001760000", payload, recorded_at)
        
        assert len(events) == 1
        event = events[0]
        assert event.stop_gid == "9021014001760000"
        assert event.journey_gid == "9015014500600123"
        assert event.line_number == "5"
        assert event.planned_time == datetime(2026, 3, 15, 10, 0, 0, tzinfo=timezone.utc)
        assert event.estimated_time == datetime(2026, 3, 15, 10, 2, 30, tzinfo=timezone.utc)
        assert event.delay_seconds == 150
        assert event.is_cancelled is False
        assert event.realtime_missing is False
        assert event.transport_mode == "tram"

    def test_extract_events_missing_estimated_time(self):
        """Handle departure with missing estimated time (realtime_missing=True)."""
        payload = {
            "departures": [
                {
                    "journey": {"gid": "9015014500600456"},
                    "line": {"shortName": "16", "transportMode": "bus"},
                    "planned": "2026-03-15T10:00:00Z",
                    "estimated": None
                }
            ]
        }
        recorded_at = datetime(2026, 3, 15, 9, 55, tzinfo=timezone.utc)
        
        events = _extract_events("9021014001760000", payload, recorded_at)
        
        assert len(events) == 1
        event = events[0]
        assert event.estimated_time is None
        assert event.delay_seconds is None
        assert event.realtime_missing is True

    def test_extract_events_cancelled_departure(self):
        """Handle cancelled departures."""
        payload = {
            "results": [
                {
                    "serviceJourney": {
                        "gid": "9015014500600789",
                        "line": {"shortName": "11", "transportMode": "tram"}
                    },
                    "plannedTime": "2026-03-15T10:00:00Z",
                    "estimatedTime": "2026-03-15T10:00:00Z",
                    "isCancelled": True
                }
            ]
        }
        recorded_at = datetime(2026, 3, 15, 9, 55, tzinfo=timezone.utc)
        
        events = _extract_events("9021014001760000", payload, recorded_at)
        
        assert len(events) == 1
        assert events[0].is_cancelled is True

    def test_extract_events_skips_missing_planned_time(self):
        """Skip departures without planned time."""
        payload = {
            "results": [
                {
                    "serviceJourney": {
                        "gid": "9015014500600999",
                        "line": {"shortName": "5", "transportMode": "tram"}
                    },
                    "plannedTime": None,
                    "estimatedTime": "2026-03-15T10:00:00Z"
                }
            ]
        }
        recorded_at = datetime(2026, 3, 15, 9, 55, tzinfo=timezone.utc)
        
        events = _extract_events("9021014001760000", payload, recorded_at)
        
        assert len(events) == 0

    def test_extract_events_filters_unsupported_transport_modes(self):
        """Filter out unsupported transport modes."""
        payload = {
            "results": [
                {
                    "serviceJourney": {
                        "gid": "9015014500601111",
                        "line": {"shortName": "TRAIN", "transportMode": "train"}
                    },
                    "plannedTime": "2026-03-15T10:00:00Z",
                    "estimatedTime": "2026-03-15T10:02:00Z"
                },
                {
                    "serviceJourney": {
                        "gid": "9015014500602222",
                        "line": {"shortName": "5", "transportMode": "tram"}
                    },
                    "plannedTime": "2026-03-15T10:05:00Z",
                    "estimatedTime": "2026-03-15T10:06:00Z"
                }
            ]
        }
        recorded_at = datetime(2026, 3, 15, 9, 55, tzinfo=timezone.utc)
        
        events = _extract_events("9021014001760000", payload, recorded_at)
        
        assert len(events) == 1
        assert events[0].line_number == "5"
        assert events[0].transport_mode == "tram"

    def test_extract_events_handles_alternative_field_names(self):
        """Handle alternative field names from API variations."""
        payload = {
            "departures": [
                {
                    "gid": "9015014500603333",
                    "line": {"name": "Express", "transportMode": "bus"},
                    "scheduledTime": "2026-03-15T10:00:00Z",
                    "realtimeTime": "2026-03-15T10:01:00Z"
                }
            ]
        }
        recorded_at = datetime(2026, 3, 15, 9, 55, tzinfo=timezone.utc)
        
        events = _extract_events("9021014001760000", payload, recorded_at)
        
        assert len(events) == 1
        assert events[0].journey_gid == "9015014500603333"
        assert events[0].line_number == "Express"
        assert events[0].delay_seconds == 60

    def test_extract_events_uses_fallback_for_unknown_journey_gid(self):
        """Use 'unknown' as fallback for missing journey GID."""
        payload = {
            "results": [
                {
                    "serviceJourney": {
                        "line": {"shortName": "5", "transportMode": "tram"}
                    },
                    "plannedTime": "2026-03-15T10:00:00Z",
                    "estimatedTime": "2026-03-15T10:00:00Z"
                }
            ]
        }
        recorded_at = datetime(2026, 3, 15, 9, 55, tzinfo=timezone.utc)
        
        events = _extract_events("9021014001760000", payload, recorded_at)
        
        assert len(events) == 1
        assert events[0].journey_gid == "unknown"

    def test_extract_events_calculates_negative_delay(self):
        """Handle early departures (negative delay)."""
        payload = {
            "results": [
                {
                    "serviceJourney": {
                        "gid": "9015014500604444",
                        "line": {"shortName": "6", "transportMode": "tram"}
                    },
                    "plannedTime": "2026-03-15T10:00:00Z",
                    "estimatedTime": "2026-03-15T09:58:00Z"
                }
            ]
        }
        recorded_at = datetime(2026, 3, 15, 9, 55, tzinfo=timezone.utc)
        
        events = _extract_events("9021014001760000", payload, recorded_at)
        
        assert len(events) == 1
        assert events[0].delay_seconds == -120

    def test_extract_events_empty_payload(self):
        """Handle empty API response."""
        events = _extract_events("9021014001760000", {}, datetime.now(timezone.utc))
        assert events == []

    def test_extract_events_empty_results(self):
        """Handle API response with empty results."""
        payload = {"results": []}
        events = _extract_events("9021014001760000", payload, datetime.now(timezone.utc))
        assert events == []

    def test_extract_events_multiple_departures(self):
        """Extract multiple departure events from a single payload."""
        payload = {
            "results": [
                {
                    "serviceJourney": {
                        "gid": f"901501450060{i:04d}",
                        "line": {"shortName": str(i % 13 + 1), "transportMode": "tram"}
                    },
                    "plannedTime": f"2026-03-15T10:{i:02d}:00Z",
                    "estimatedTime": f"2026-03-15T10:{i:02d}:{i*10:02d}Z"
                }
                for i in range(5)
            ]
        }
        recorded_at = datetime(2026, 3, 15, 9, 55, tzinfo=timezone.utc)
        
        events = _extract_events("9021014001760000", payload, recorded_at)
        
        assert len(events) == 5
        for i, event in enumerate(events):
            assert event.line_number == str(i % 13 + 1)
            assert event.delay_seconds == i * 10

    def test_extract_events_uses_fallback_transport_mode_when_not_in_api(self):
        """Use fallback heuristic when transportMode is missing."""
        payload = {
            "results": [
                {
                    "serviceJourney": {
                        "gid": "9015014500605555",
                        "line": {"shortName": "5"}
                    },
                    "plannedTime": "2026-03-15T10:00:00Z",
                    "estimatedTime": "2026-03-15T10:02:00Z"
                },
                {
                    "serviceJourney": {
                        "gid": "9015014500606666",
                        "line": {"shortName": "285"}
                    },
                    "plannedTime": "2026-03-15T10:10:00Z",
                    "estimatedTime": "2026-03-15T10:11:00Z"
                }
            ]
        }
        recorded_at = datetime(2026, 3, 15, 9, 55, tzinfo=timezone.utc)
        
        events = _extract_events("9021014001760000", payload, recorded_at)
        
        assert len(events) == 2
        assert events[0].line_number == "5"
        assert events[0].transport_mode == "tram"
        assert events[1].line_number == "285"
        assert events[1].transport_mode == "ferry"


class TestLineMetadataExtraction:
    """Tests for line metadata extraction logic."""

    def test_extract_line_metadata_basic(self):
        """Extract basic line metadata."""
        payload = {
            "results": [
                {
                    "serviceJourney": {
                        "line": {
                            "shortName": "5",
                            "foregroundColor": "FFFFFF",
                            "backgroundColor": "009E73",
                            "transportMode": "tram"
                        }
                    },
                    "plannedTime": "2026-03-15T10:00:00Z"
                }
            ]
        }
        
        metadata = _extract_line_metadata(payload)
        
        assert len(metadata) == 1
        line = metadata[0]
        assert line.line_number == "5"
        assert line.foreground_color == "FFFFFF"
        assert line.background_color == "009E73"
        assert line.text_color is None
        assert line.border_color is None
        assert line.transport_mode == "tram"

    def test_extract_line_metadata_deduplicates(self):
        """Deduplicate line metadata for same line appearing multiple times."""
        payload = {
            "results": [
                {
                    "serviceJourney": {
                        "line": {
                            "shortName": "5",
                            "backgroundColor": "009E73",
                            "transportMode": "tram"
                        }
                    },
                    "plannedTime": "2026-03-15T10:00:00Z"
                },
                {
                    "serviceJourney": {
                        "line": {
                            "shortName": "5",
                            "backgroundColor": "009E73",
                            "transportMode": "tram"
                        }
                    },
                    "plannedTime": "2026-03-15T10:05:00Z"
                }
            ]
        }
        
        metadata = _extract_line_metadata(payload)
        
        assert len(metadata) == 1

    def test_extract_line_metadata_skips_missing_line_number(self):
        """Skip entries without line number."""
        payload = {
            "results": [
                {
                    "serviceJourney": {
                        "line": {
                            "backgroundColor": "009E73",
                            "transportMode": "tram"
                        }
                    },
                    "plannedTime": "2026-03-15T10:00:00Z"
                }
            ]
        }
        
        metadata = _extract_line_metadata(payload)
        
        assert len(metadata) == 0

    def test_extract_line_metadata_filters_unsupported_transport_modes(self):
        """Filter out lines with unsupported transport modes."""
        payload = {
            "results": [
                {
                    "line": {"shortName": "TRAIN", "transportMode": "train"},
                    "plannedTime": "2026-03-15T10:00:00Z"
                },
                {
                    "line": {"shortName": "5", "transportMode": "tram"},
                    "plannedTime": "2026-03-15T10:05:00Z"
                }
            ]
        }
        
        metadata = _extract_line_metadata(payload)
        
        assert len(metadata) == 1
        assert metadata[0].line_number == "5"

    def test_extract_line_metadata_handles_alternative_field_names(self):
        """Handle alternative field names for colors."""
        payload = {
            "results": [
                {
                    "line": {
                        "name": "Express",
                        "fgColor": "000000",
                        "bgColor": "FFFF00",
                        "transportMode": "bus"
                    },
                    "plannedTime": "2026-03-15T10:00:00Z"
                }
            ]
        }
        
        metadata = _extract_line_metadata(payload)
        
        assert len(metadata) == 1
        assert metadata[0].line_number == "Express"
        assert metadata[0].foreground_color == "000000"
        assert metadata[0].background_color == "FFFF00"

    def test_extract_line_metadata_all_color_fields(self):
        """Extract all optional color fields when present."""
        payload = {
            "results": [
                {
                    "serviceJourney": {
                        "line": {
                            "shortName": "11",
                            "foregroundColor": "111111",
                            "backgroundColor": "222222",
                            "textColor": "333333",
                            "borderColor": "444444",
                            "transportMode": "tram"
                        }
                    },
                    "plannedTime": "2026-03-15T10:00:00Z"
                }
            ]
        }
        
        metadata = _extract_line_metadata(payload)
        
        assert len(metadata) == 1
        line = metadata[0]
        assert line.foreground_color == "111111"
        assert line.background_color == "222222"
        assert line.text_color == "333333"
        assert line.border_color == "444444"


class TestPollCycleIntegration:
    """Integration tests for full poll cycle."""

    @pytest.mark.anyio
    async def test_run_poll_cycle_fetches_all_stops_and_inserts_events(self, monkeypatch):
        """Run poll cycle should fetch all monitored stops and insert events."""
        mock_vt_client = Mock()
        mock_vt_client.fetch_departures = AsyncMock(return_value={
            "results": [
                {
                    "serviceJourney": {
                        "gid": "9015014500600123",
                        "line": {"shortName": "5", "transportMode": "tram"}
                    },
                    "plannedTime": "2026-03-15T10:00:00Z",
                    "estimatedTime": "2026-03-15T10:02:00Z"
                }
            ]
        })
        
        inserted_events = []
        
        class FakeConn:
            async def executemany(self, sql: str, rows):
                for row in rows:
                    inserted_events.append(row)
        
        class FakePool:
            async def __aenter__(self):
                return self
            
            async def __aexit__(self, *args):
                pass
            
            def acquire(self):
                return FakePoolContext()
        
        class FakePoolContext:
            async def __aenter__(self):
                return FakeConn()
            
            async def __aexit__(self, *args):
                pass
        
        fake_pool = FakePool()
        
        monkeypatch.setattr(
            "gbg_gridlock_api.worker.TARGET_STOP_AREA_GIDS",
            ["9021014001760000", "9021014002510000"]
        )
        
        await run_poll_cycle(fake_pool, mock_vt_client, http_concurrency=5)
        
        assert mock_vt_client.fetch_departures.call_count == 2
        assert len(inserted_events) == 2

    @pytest.mark.anyio
    async def test_run_poll_cycle_continues_on_individual_stop_failure(self, monkeypatch):
        """Poll cycle should continue even if one stop fails."""
        call_count = 0
        
        async def mock_fetch_departures(http_client, stop_gid):
            nonlocal call_count
            call_count += 1
            if stop_gid == "9021014001760000":
                raise Exception("API timeout")
            return {
                "results": [
                    {
                        "serviceJourney": {
                            "gid": "9015014500600456",
                            "line": {"shortName": "11", "transportMode": "tram"}
                        },
                        "plannedTime": "2026-03-15T10:00:00Z",
                        "estimatedTime": "2026-03-15T10:01:00Z"
                    }
                ]
            }
        
        mock_vt_client = Mock()
        mock_vt_client.fetch_departures = mock_fetch_departures
        
        inserted_events = []
        
        class FakeConn:
            async def executemany(self, sql: str, rows):
                for row in rows:
                    inserted_events.append(row)
        
        class FakePool:
            async def __aenter__(self):
                return self
            
            async def __aexit__(self, *args):
                pass
            
            def acquire(self):
                return FakePoolContext()
        
        class FakePoolContext:
            async def __aenter__(self):
                return FakeConn()
            
            async def __aexit__(self, *args):
                pass
        
        fake_pool = FakePool()
        
        monkeypatch.setattr(
            "gbg_gridlock_api.worker.TARGET_STOP_AREA_GIDS",
            ["9021014001760000", "9021014002510000"]
        )
        
        await run_poll_cycle(fake_pool, mock_vt_client, http_concurrency=5)
        
        assert call_count == 2
        assert len(inserted_events) == 1

    @pytest.mark.anyio
    async def test_fetch_line_metadata_once_caches_all_lines(self, monkeypatch):
        """Fetch line metadata should cache all unique lines."""
        mock_vt_client = Mock()
        mock_vt_client.fetch_departures = AsyncMock(return_value={
            "results": [
                {
                    "serviceJourney": {
                        "line": {
                            "shortName": "5",
                            "backgroundColor": "009E73",
                            "transportMode": "tram"
                        }
                    },
                    "plannedTime": "2026-03-15T10:00:00Z"
                },
                {
                    "serviceJourney": {
                        "line": {
                            "shortName": "11",
                            "backgroundColor": "F0E442",
                            "transportMode": "tram"
                        }
                    },
                    "plannedTime": "2026-03-15T10:05:00Z"
                }
            ]
        })
        
        upserted_lines = []
        
        class FakeConn:
            async def executemany(self, sql: str, rows):
                for row in rows:
                    upserted_lines.append(row)
        
        class FakePool:
            async def __aenter__(self):
                return self
            
            async def __aexit__(self, *args):
                pass
            
            def acquire(self):
                return FakePoolContext()
        
        class FakePoolContext:
            async def __aenter__(self):
                return FakeConn()
            
            async def __aexit__(self, *args):
                pass
        
        fake_pool = FakePool()
        
        monkeypatch.setattr(
            "gbg_gridlock_api.worker.TARGET_STOP_AREA_GIDS",
            ["9021014001760000", "9021014002510000"]
        )
        
        await fetch_line_metadata_once(fake_pool, mock_vt_client, http_concurrency=5)
        
        assert mock_vt_client.fetch_departures.call_count == 2
        assert len(upserted_lines) >= 2

    @pytest.mark.anyio
    async def test_fetch_line_metadata_once_handles_failures_gracefully(self, monkeypatch):
        """Metadata fetch should continue even if some stops fail."""
        call_count = 0
        
        async def mock_fetch_departures(http_client, stop_gid):
            nonlocal call_count
            call_count += 1
            if stop_gid == "9021014001760000":
                raise Exception("Network error")
            return {
                "results": [
                    {
                        "serviceJourney": {
                            "line": {
                                "shortName": "11",
                                "backgroundColor": "F0E442",
                                "transportMode": "tram"
                            }
                        },
                        "plannedTime": "2026-03-15T10:00:00Z"
                    }
                ]
            }
        
        mock_vt_client = Mock()
        mock_vt_client.fetch_departures = mock_fetch_departures
        
        upserted_lines = []
        
        class FakeConn:
            async def executemany(self, sql: str, rows):
                for row in rows:
                    upserted_lines.append(row)
        
        class FakePool:
            async def __aenter__(self):
                return self
            
            async def __aexit__(self, *args):
                pass
            
            def acquire(self):
                return FakePoolContext()
        
        class FakePoolContext:
            async def __aenter__(self):
                return FakeConn()
            
            async def __aexit__(self, *args):
                pass
        
        fake_pool = FakePool()
        
        monkeypatch.setattr(
            "gbg_gridlock_api.worker.TARGET_STOP_AREA_GIDS",
            ["9021014001760000", "9021014002510000", "9021014003610000"]
        )
        
        await fetch_line_metadata_once(fake_pool, mock_vt_client, http_concurrency=5)
        
        assert call_count == 3
        assert len(upserted_lines) >= 1


class TestEdgeCases:
    """Tests for edge cases and error conditions."""

    def test_extract_events_handles_large_delay(self):
        """Handle very large delays correctly."""
        payload = {
            "results": [
                {
                    "serviceJourney": {
                        "gid": "9015014500607777",
                        "line": {"shortName": "19", "transportMode": "bus"}
                    },
                    "plannedTime": "2026-03-15T10:00:00Z",
                    "estimatedTime": "2026-03-15T12:30:00Z"
                }
            ]
        }
        recorded_at = datetime(2026, 3, 15, 9, 55, tzinfo=timezone.utc)
        
        events = _extract_events("9021014001760000", payload, recorded_at)
        
        assert len(events) == 1
        assert events[0].delay_seconds == 9000

    def test_extract_events_handles_timezone_aware_timestamps(self):
        """Handle timestamps with different timezone offsets."""
        payload = {
            "results": [
                {
                    "serviceJourney": {
                        "gid": "9015014500608888",
                        "line": {"shortName": "6", "transportMode": "tram"}
                    },
                    "plannedTime": "2026-03-15T11:00:00+01:00",
                    "estimatedTime": "2026-03-15T11:03:00+01:00"
                }
            ]
        }
        recorded_at = datetime(2026, 3, 15, 9, 55, tzinfo=timezone.utc)
        
        events = _extract_events("9021014001760000", payload, recorded_at)
        
        assert len(events) == 1
        assert events[0].delay_seconds == 180

    def test_extract_events_with_boat_transport_mode(self):
        """Handle 'boat' as valid transport mode (alias for ferry)."""
        payload = {
            "results": [
                {
                    "serviceJourney": {
                        "gid": "9015014500609999",
                        "line": {"shortName": "287", "transportMode": "boat"}
                    },
                    "plannedTime": "2026-03-15T10:00:00Z",
                    "estimatedTime": "2026-03-15T10:01:00Z"
                }
            ]
        }
        recorded_at = datetime(2026, 3, 15, 9, 55, tzinfo=timezone.utc)
        
        events = _extract_events("9021014001760000", payload, recorded_at)
        
        assert len(events) == 1
        assert events[0].transport_mode == "boat"

    def test_extract_line_metadata_uses_fallback_for_missing_transport_mode(self):
        """Use fallback heuristic for metadata when transport mode missing."""
        payload = {
            "results": [
                {
                    "line": {
                        "shortName": "5",
                        "backgroundColor": "009E73"
                    },
                    "plannedTime": "2026-03-15T10:00:00Z"
                },
                {
                    "line": {
                        "shortName": "285",
                        "backgroundColor": "0072B2"
                    },
                    "plannedTime": "2026-03-15T10:05:00Z"
                }
            ]
        }
        
        metadata = _extract_line_metadata(payload)
        
        assert len(metadata) == 2
        line_5 = next(m for m in metadata if m.line_number == "5")
        line_285 = next(m for m in metadata if m.line_number == "285")
        assert line_5.transport_mode == "tram"
        assert line_285.transport_mode == "ferry"

    def test_extract_events_handles_malformed_journey_structure(self):
        """Handle various ways journey GID might be structured."""
        payloads = [
            {
                "results": [{
                    "serviceJourney": {"gid": "FROM_SERVICE_JOURNEY"},
                    "line": {"shortName": "5", "transportMode": "tram"},
                    "plannedTime": "2026-03-15T10:00:00Z",
                    "estimatedTime": "2026-03-15T10:00:00Z"
                }]
            },
            {
                "results": [{
                    "journey": {"gid": "FROM_JOURNEY"},
                    "line": {"shortName": "5", "transportMode": "tram"},
                    "plannedTime": "2026-03-15T10:00:00Z",
                    "estimatedTime": "2026-03-15T10:00:00Z"
                }]
            },
            {
                "results": [{
                    "gid": "FROM_TOP_LEVEL",
                    "line": {"shortName": "5", "transportMode": "tram"},
                    "plannedTime": "2026-03-15T10:00:00Z",
                    "estimatedTime": "2026-03-15T10:00:00Z"
                }]
            }
        ]
        
        recorded_at = datetime(2026, 3, 15, 9, 55, tzinfo=timezone.utc)
        
        for payload in payloads:
            events = _extract_events("9021014001760000", payload, recorded_at)
            assert len(events) == 1
            assert events[0].journey_gid in ["FROM_SERVICE_JOURNEY", "FROM_JOURNEY", "FROM_TOP_LEVEL"]

    def test_extract_events_handles_zero_delay(self):
        """Handle departures exactly on time (zero delay)."""
        payload = {
            "results": [
                {
                    "serviceJourney": {
                        "gid": "9015014500610000",
                        "line": {"shortName": "5", "transportMode": "tram"}
                    },
                    "plannedTime": "2026-03-15T10:00:00Z",
                    "estimatedTime": "2026-03-15T10:00:00Z"
                }
            ]
        }
        recorded_at = datetime(2026, 3, 15, 9, 55, tzinfo=timezone.utc)
        
        events = _extract_events("9021014001760000", payload, recorded_at)
        
        assert len(events) == 1
        assert events[0].delay_seconds == 0

    def test_extract_events_preserves_recorded_at_timestamp(self):
        """All events should use the same recorded_at timestamp."""
        payload = {
            "results": [
                {
                    "serviceJourney": {
                        "gid": f"901501450061{i:04d}",
                        "line": {"shortName": str(i + 1), "transportMode": "tram"}
                    },
                    "plannedTime": f"2026-03-15T10:{i:02d}:00Z",
                    "estimatedTime": f"2026-03-15T10:{i:02d}:00Z"
                }
                for i in range(3)
            ]
        }
        recorded_at = datetime(2026, 3, 15, 9, 55, 23, 456789, tzinfo=timezone.utc)
        
        events = _extract_events("9021014001760000", payload, recorded_at)
        
        assert len(events) == 3
        for event in events:
            assert event.recorded_at == recorded_at
