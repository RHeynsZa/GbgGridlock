"""set timezone to UTC

Revision ID: 20260319_01
Revises: 20260318_01
Create Date: 2026-03-19 00:00:00
"""

from __future__ import annotations

from alembic import op

# revision identifiers, used by Alembic.
revision = "20260319_01"
down_revision = "20260318_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("SET timezone TO 'UTC'")


def downgrade() -> None:
    pass
