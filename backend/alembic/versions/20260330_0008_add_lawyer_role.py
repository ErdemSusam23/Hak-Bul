"""add lawyer role to userrole enum

Revision ID: 20260330_0008
Revises: 20260326_0007
Create Date: 2026-03-30
"""

from typing import Sequence, Union

from alembic import op

revision: str = "20260330_0008"
down_revision: Union[str, Sequence[str], None] = "20260326_0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        with op.get_context().autocommit_block():
            op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'lawyer'")


def downgrade() -> None:
    # PostgreSQL enum değeri kaldırma desteklenmiyor; no-op
    pass
