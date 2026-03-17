"""add message_feedback table

Revision ID: 20260317_0004
Revises: 20260316_0003
Create Date: 2026-03-17
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260317_0004"
down_revision: Union[str, Sequence[str], None] = "20260316_0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "message_feedback",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "message_id",
            sa.String(36),
            sa.ForeignKey("chat_history.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("puan", sa.Integer(), nullable=False),
        sa.Column(
            "user_id",
            sa.String(36),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("guest_session_id", sa.String(36), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_message_feedback_message_id", "message_feedback", ["message_id"])
    op.create_check_constraint("ck_feedback_puan", "message_feedback", "puan IN (1, -1)")


def downgrade() -> None:
    op.drop_table("message_feedback")
