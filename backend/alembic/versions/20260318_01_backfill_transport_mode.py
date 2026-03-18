"""backfill transport_mode for existing records

Revision ID: 20260318_01
Revises: 20260314_01
Create Date: 2026-03-18 00:00:00
"""

from __future__ import annotations

from alembic import op

# revision identifiers, used by Alembic.
revision = "20260318_01"
down_revision = "20260314_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Backfill transport_mode for existing records using heuristic."""
    
    # Backfill line_metadata using line number heuristic
    op.execute(
        """
        UPDATE line_metadata
        SET transport_mode = CASE
            -- Ferry: lines starting with 2
            WHEN line_number ~ '^2' THEN 'ferry'
            -- Tram: lines 1-13
            WHEN line_number ~ '^[1-9]$' OR line_number = '10' OR line_number = '11' OR line_number = '12' OR line_number = '13' THEN 'tram'
            -- Bus: everything else
            ELSE 'bus'
        END
        WHERE transport_mode IS NULL
        """
    )
    
    # Backfill departure_delay_events by joining with line_metadata
    # (which now has transport_mode populated)
    op.execute(
        """
        UPDATE departure_delay_events e
        SET transport_mode = m.transport_mode
        FROM line_metadata m
        WHERE e.line_number = m.line_number
          AND e.transport_mode IS NULL
          AND m.transport_mode IS NOT NULL
        """
    )
    
    # For any remaining NULL values in departure_delay_events
    # (lines not in line_metadata), apply the same heuristic
    op.execute(
        """
        UPDATE departure_delay_events
        SET transport_mode = CASE
            -- Ferry: lines starting with 2
            WHEN line_number ~ '^2' THEN 'ferry'
            -- Tram: lines 1-13
            WHEN line_number ~ '^[1-9]$' OR line_number = '10' OR line_number = '11' OR line_number = '12' OR line_number = '13' THEN 'tram'
            -- Bus: everything else
            ELSE 'bus'
        END
        WHERE transport_mode IS NULL
        """
    )


def downgrade() -> None:
    """No downgrade - backfilled data remains."""
    pass
