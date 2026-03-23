"""create monitored_stops table

Revision ID: 20260323_01
Revises: 20260319_01
Create Date: 2026-03-23 00:00:00
"""

from __future__ import annotations

from alembic import op

# revision identifiers, used by Alembic.
revision = "20260323_01"
down_revision = "20260319_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS monitored_stops (
          stop_name VARCHAR PRIMARY KEY,
          stop_gid VARCHAR NOT NULL,
          last_verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """
    )

    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_monitored_stops_stop_gid
          ON monitored_stops (stop_gid)
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS monitored_stops")
