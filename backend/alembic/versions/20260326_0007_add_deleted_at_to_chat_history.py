"""add deleted_at to chat_history

Revision ID: 20260326_0007
Revises: 20260326_0006
Create Date: 2026-03-26
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260326_0007"
down_revision: Union[str, Sequence[str], None] = "20260326_0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("chat_history", sa.Column("deleted_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("chat_history", "deleted_at")
