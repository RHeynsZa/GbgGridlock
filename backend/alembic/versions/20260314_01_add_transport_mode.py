"""add transport_mode column

Revision ID: 20260314_01
Revises: 20260312_01
Create Date: 2026-03-14 00:00:00
"""

from __future__ import annotations

from alembic import op

# revision identifiers, used by Alembic.
revision = "20260314_01"
down_revision = "20260312_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE departure_delay_events
        ADD COLUMN IF NOT EXISTS transport_mode VARCHAR
        """
    )
    
    op.execute(
        """
        ALTER TABLE line_metadata
        ADD COLUMN IF NOT EXISTS transport_mode VARCHAR
        """
    )
    
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_delay_events_transport_mode
          ON departure_delay_events (transport_mode)
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_delay_events_transport_mode")
    op.execute("ALTER TABLE line_metadata DROP COLUMN IF EXISTS transport_mode")
    op.execute("ALTER TABLE departure_delay_events DROP COLUMN IF EXISTS transport_mode")
