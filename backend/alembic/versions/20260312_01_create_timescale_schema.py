"""create timescale schema

Revision ID: 20260312_01
Revises:
Create Date: 2026-03-12 00:00:00
"""

from __future__ import annotations

from alembic import op

# revision identifiers, used by Alembic.
revision = "20260312_01"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS timescaledb")

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS departure_delay_events (
          recorded_at TIMESTAMPTZ NOT NULL,
          stop_gid VARCHAR NOT NULL,
          journey_gid VARCHAR NOT NULL,
          line_number VARCHAR NOT NULL,
          planned_time TIMESTAMPTZ NOT NULL,
          estimated_time TIMESTAMPTZ,
          delay_seconds INTEGER,
          is_cancelled BOOLEAN NOT NULL DEFAULT FALSE,
          realtime_missing BOOLEAN NOT NULL DEFAULT FALSE,
          PRIMARY KEY (recorded_at, stop_gid, journey_gid)
        )
        """
    )

    op.execute(
        "SELECT create_hypertable('departure_delay_events', 'recorded_at', if_not_exists => TRUE)"
    )

    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_delay_events_line_recorded_at
          ON departure_delay_events (line_number, recorded_at DESC)
        """
    )

    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_delay_events_stop_recorded_at
          ON departure_delay_events (stop_gid, recorded_at DESC)
        """
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS line_metadata (
          line_number VARCHAR PRIMARY KEY,
          foreground_color VARCHAR,
          background_color VARCHAR,
          text_color VARCHAR,
          border_color VARCHAR,
          last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """
    )

    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_line_metadata_updated_at
          ON line_metadata (updated_at DESC)
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS line_metadata")
    op.execute("DROP TABLE IF EXISTS departure_delay_events")
