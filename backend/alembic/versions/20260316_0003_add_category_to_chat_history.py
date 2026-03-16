"""add category to chat_history

Revision ID: 20260316_0003
Revises: 20260305_0002
Create Date: 2026-03-16
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260316_0003"
down_revision: Union[str, Sequence[str], None] = "20260305_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "chat_history",
        sa.Column("category", sa.String(length=50), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("chat_history", "category")
