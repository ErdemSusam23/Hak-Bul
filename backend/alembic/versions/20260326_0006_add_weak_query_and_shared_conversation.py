"""add weak_query and shared_conversation tables

Revision ID: 20260326_0006
Revises: 20260317_0005
Create Date: 2026-03-26
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260326_0006"
down_revision: Union[str, Sequence[str], None] = "20260317_0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "weak_queries",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("soru", sa.Text(), nullable=False),
        sa.Column("max_skor", sa.Float(), nullable=False),
        sa.Column("kategori", sa.String(50), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "shared_conversations",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("share_token", sa.String(64), nullable=False, unique=True),
        sa.Column("conversation_id", sa.String(36), nullable=False),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, default=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_shared_conversations_share_token", "shared_conversations", ["share_token"])
    op.create_index("ix_shared_conversations_conversation_id", "shared_conversations", ["conversation_id"])


def downgrade() -> None:
    op.drop_index("ix_shared_conversations_conversation_id", table_name="shared_conversations")
    op.drop_index("ix_shared_conversations_share_token", table_name="shared_conversations")
    op.drop_table("shared_conversations")
    op.drop_table("weak_queries")
