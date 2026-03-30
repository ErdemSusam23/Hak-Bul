"""create forum tables

Revision ID: 20260330_0009
Revises: 20260330_0008
Create Date: 2026-03-30
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260330_0009"
down_revision: Union[str, Sequence[str], None] = "20260330_0008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "forum_threads",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("category", sa.String(50), nullable=False),
        sa.Column("is_locked", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_forum_threads_user_id", "forum_threads", ["user_id"])
    op.create_index("ix_forum_threads_category", "forum_threads", ["category"])

    op.create_table(
        "forum_replies",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("thread_id", sa.String(36), sa.ForeignKey("forum_threads.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_forum_replies_thread_id", "forum_replies", ["thread_id"])
    op.create_index("ix_forum_replies_user_id", "forum_replies", ["user_id"])

    op.create_table(
        "forum_votes",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("target_type", sa.String(10), nullable=False),
        sa.Column("target_id", sa.String(36), nullable=False),
        sa.Column("value", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("user_id", "target_type", "target_id", name="uq_forum_vote_user_target"),
        sa.CheckConstraint("value IN (1, -1)", name="ck_forum_vote_value"),
    )
    op.create_index("ix_forum_votes_user_id", "forum_votes", ["user_id"])
    op.create_index("ix_forum_votes_target_id", "forum_votes", ["target_id"])


def downgrade() -> None:
    op.drop_index("ix_forum_votes_target_id", table_name="forum_votes")
    op.drop_index("ix_forum_votes_user_id", table_name="forum_votes")
    op.drop_table("forum_votes")

    op.drop_index("ix_forum_replies_user_id", table_name="forum_replies")
    op.drop_index("ix_forum_replies_thread_id", table_name="forum_replies")
    op.drop_table("forum_replies")

    op.drop_index("ix_forum_threads_category", table_name="forum_threads")
    op.drop_index("ix_forum_threads_user_id", table_name="forum_threads")
    op.drop_table("forum_threads")

    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("DROP TYPE IF EXISTS forumvotetype")
