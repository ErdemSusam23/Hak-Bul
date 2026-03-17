"""add title to chat_history

Revision ID: 20260317_0005
Revises: 20260317_0004
Create Date: 2026-03-17
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260317_0005"
down_revision: Union[str, Sequence[str], None] = "20260317_0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("chat_history", sa.Column("title", sa.String(120), nullable=True))


def downgrade() -> None:
    op.drop_column("chat_history", "title")
