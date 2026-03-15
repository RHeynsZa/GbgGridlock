from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import AsyncMock, call
import pytest

from gbg_gridlock_api.worker_repository import insert_events, upsert_line_metadata
from gbg_gridlock_api.worker_models import DepartureDelayEvent, LineMetadata


class TestInsertEvents:
    """Tests for departure delay event insertion."""

    @pytest.mark.anyio
    async def test_insert_events_with_valid_events(self):
        """Insert multiple departure delay events."""
        events = [
            DepartureDelayEvent(
                recorded_at=datetime(2026, 3, 15, 10, 0, tzinfo=timezone.utc),
                stop_gid="9021014001760000",
                journey_gid="9015014500600123",
                line_number="5",
                planned_time=datetime(2026, 3, 15, 10, 5, tzinfo=timezone.utc),
                estimated_time=datetime(2026, 3, 15, 10, 7, tzinfo=timezone.utc),
                delay_seconds=120,
                is_cancelled=False,
                realtime_missing=False,
                transport_mode="tram",
            ),
            DepartureDelayEvent(
                recorded_at=datetime(2026, 3, 15, 10, 0, tzinfo=timezone.utc),
                stop_gid="9021014002510000",
                journey_gid="9015014500600456",
                line_number="11",
                planned_time=datetime(2026, 3, 15, 10, 10, tzinfo=timezone.utc),
                estimated_time=None,
                delay_seconds=None,
                is_cancelled=False,
                realtime_missing=True,
                transport_mode="tram",
            ),
        ]
        
        mock_conn = AsyncMock()
        
        await insert_events(mock_conn, events)
        
        mock_conn.executemany.assert_called_once()
        sql, rows = mock_conn.executemany.call_args[0]
        
        assert "INSERT INTO departure_delay_events" in sql
        assert "ON CONFLICT" in sql
        assert len(rows) == 2
        
        assert rows[0][0] == datetime(2026, 3, 15, 10, 0, tzinfo=timezone.utc)
        assert rows[0][1] == "9021014001760000"
        assert rows[0][2] == "9015014500600123"
        assert rows[0][3] == "5"
        assert rows[0][4] == datetime(2026, 3, 15, 10, 5, tzinfo=timezone.utc)
        assert rows[0][5] == datetime(2026, 3, 15, 10, 7, tzinfo=timezone.utc)
        assert rows[0][6] == 120
        assert rows[0][7] is False
        assert rows[0][8] is False
        
        assert rows[1][5] is None
        assert rows[1][6] is None
        assert rows[1][8] is True

    @pytest.mark.anyio
    async def test_insert_events_with_empty_list(self):
        """Insert events should no-op with empty list."""
        mock_conn = AsyncMock()
        
        await insert_events(mock_conn, [])
        
        mock_conn.executemany.assert_not_called()

    @pytest.mark.anyio
    async def test_insert_events_with_cancelled_event(self):
        """Insert cancelled event correctly."""
        events = [
            DepartureDelayEvent(
                recorded_at=datetime(2026, 3, 15, 10, 0, tzinfo=timezone.utc),
                stop_gid="9021014001760000",
                journey_gid="9015014500600789",
                line_number="5",
                planned_time=datetime(2026, 3, 15, 10, 5, tzinfo=timezone.utc),
                estimated_time=datetime(2026, 3, 15, 10, 5, tzinfo=timezone.utc),
                delay_seconds=0,
                is_cancelled=True,
                realtime_missing=False,
                transport_mode="tram",
            )
        ]
        
        mock_conn = AsyncMock()
        
        await insert_events(mock_conn, events)
        
        mock_conn.executemany.assert_called_once()
        _, rows = mock_conn.executemany.call_args[0]
        assert rows[0][7] is True

    @pytest.mark.anyio
    async def test_insert_events_with_negative_delay(self):
        """Insert event with negative delay (early departure)."""
        events = [
            DepartureDelayEvent(
                recorded_at=datetime(2026, 3, 15, 10, 0, tzinfo=timezone.utc),
                stop_gid="9021014001760000",
                journey_gid="9015014500601111",
                line_number="6",
                planned_time=datetime(2026, 3, 15, 10, 5, tzinfo=timezone.utc),
                estimated_time=datetime(2026, 3, 15, 10, 3, tzinfo=timezone.utc),
                delay_seconds=-120,
                is_cancelled=False,
                realtime_missing=False,
                transport_mode="tram",
            )
        ]
        
        mock_conn = AsyncMock()
        
        await insert_events(mock_conn, events)
        
        mock_conn.executemany.assert_called_once()
        _, rows = mock_conn.executemany.call_args[0]
        assert rows[0][6] == -120


class TestUpsertLineMetadata:
    """Tests for line metadata upsertion."""

    @pytest.mark.anyio
    async def test_upsert_line_metadata_with_valid_lines(self):
        """Upsert multiple line metadata entries."""
        lines = [
            LineMetadata(
                line_number="5",
                foreground_color="FFFFFF",
                background_color="009E73",
                text_color="000000",
                border_color="009E73",
                transport_mode="tram",
            ),
            LineMetadata(
                line_number="11",
                foreground_color="000000",
                background_color="F0E442",
                text_color="111827",
                border_color="F0E442",
                transport_mode="tram",
            ),
        ]
        
        mock_conn = AsyncMock()
        
        await upsert_line_metadata(mock_conn, lines)
        
        mock_conn.executemany.assert_called_once()
        sql, rows = mock_conn.executemany.call_args[0]
        
        assert "INSERT INTO line_metadata" in sql
        assert "ON CONFLICT" in sql
        assert len(rows) == 2
        
        assert rows[0] == ("5", "FFFFFF", "009E73", "000000", "009E73")
        assert rows[1] == ("11", "000000", "F0E442", "111827", "F0E442")

    @pytest.mark.anyio
    async def test_upsert_line_metadata_with_partial_colors(self):
        """Upsert line metadata with some colors missing."""
        lines = [
            LineMetadata(
                line_number="16",
                foreground_color="FFFFFF",
                background_color="D55E00",
                text_color=None,
                border_color=None,
                transport_mode="bus",
            )
        ]
        
        mock_conn = AsyncMock()
        
        await upsert_line_metadata(mock_conn, lines)
        
        mock_conn.executemany.assert_called_once()
        _, rows = mock_conn.executemany.call_args[0]
        
        assert rows[0] == ("16", "FFFFFF", "D55E00", None, None)

    @pytest.mark.anyio
    async def test_upsert_line_metadata_with_empty_list(self):
        """Upsert line metadata should no-op with empty list."""
        mock_conn = AsyncMock()
        
        await upsert_line_metadata(mock_conn, [])
        
        mock_conn.executemany.assert_not_called()

    @pytest.mark.anyio
    async def test_upsert_line_metadata_with_all_colors_none(self):
        """Upsert line metadata with all color fields as None."""
        lines = [
            LineMetadata(
                line_number="EXPRESS",
                foreground_color=None,
                background_color=None,
                text_color=None,
                border_color=None,
                transport_mode="bus",
            )
        ]
        
        mock_conn = AsyncMock()
        
        await upsert_line_metadata(mock_conn, lines)
        
        mock_conn.executemany.assert_called_once()
        _, rows = mock_conn.executemany.call_args[0]
        
        assert rows[0] == ("EXPRESS", None, None, None, None)


class TestRepositoryEdgeCases:
    """Tests for edge cases in repository operations."""

    @pytest.mark.anyio
    async def test_insert_events_handles_large_batch(self):
        """Insert a large batch of events."""
        events = [
            DepartureDelayEvent(
                recorded_at=datetime(2026, 3, 15, 10, 0, tzinfo=timezone.utc),
                stop_gid=f"902101400{i:07d}",
                journey_gid=f"901501450060{i:04d}",
                line_number=str(i % 50 + 1),
                planned_time=datetime(2026, 3, 15, 10, i % 60, tzinfo=timezone.utc),
                estimated_time=datetime(2026, 3, 15, 10, i % 60, i % 60, tzinfo=timezone.utc),
                delay_seconds=i % 60,
                is_cancelled=False,
                realtime_missing=False,
                transport_mode="tram" if i % 2 == 0 else "bus",
            )
            for i in range(100)
        ]
        
        mock_conn = AsyncMock()
        
        await insert_events(mock_conn, events)
        
        mock_conn.executemany.assert_called_once()
        _, rows = mock_conn.executemany.call_args[0]
        assert len(rows) == 100

    @pytest.mark.anyio
    async def test_upsert_line_metadata_handles_special_characters_in_line_number(self):
        """Handle line numbers with special characters."""
        lines = [
            LineMetadata(
                line_number="X4",
                foreground_color="FFFFFF",
                background_color="000000",
                text_color=None,
                border_color=None,
                transport_mode="bus",
            ),
            LineMetadata(
                line_number="BLUE EXPRESS",
                foreground_color="0000FF",
                background_color="FFFFFF",
                text_color=None,
                border_color=None,
                transport_mode="bus",
            ),
        ]
        
        mock_conn = AsyncMock()
        
        await upsert_line_metadata(mock_conn, lines)
        
        mock_conn.executemany.assert_called_once()
        _, rows = mock_conn.executemany.call_args[0]
        
        assert rows[0][0] == "X4"
        assert rows[1][0] == "BLUE EXPRESS"
