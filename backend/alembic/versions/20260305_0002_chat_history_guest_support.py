"""add guest session support to chat_history

Revision ID: 20260305_0002
Revises: 20260305_0001
Create Date: 2026-03-05 00:30:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "20260305_0002"
down_revision: Union[str, Sequence[str], None] = "20260305_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("chat_history", sa.Column("guest_session_id", sa.String(length=36), nullable=True))
    op.alter_column("chat_history", "user_id", existing_type=sa.String(length=36), nullable=True)

    op.create_index("ix_chat_history_guest_session_id", "chat_history", ["guest_session_id"], unique=False)
    op.create_index(
        "ix_chat_history_user_conversation_created",
        "chat_history",
        ["user_id", "conversation_id", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_chat_history_guest_conversation_created",
        "chat_history",
        ["guest_session_id", "conversation_id", "created_at"],
        unique=False,
    )
    op.create_check_constraint(
        "ck_chat_history_owner_xor",
        "chat_history",
        "(user_id IS NOT NULL) <> (guest_session_id IS NOT NULL)",
    )


def downgrade() -> None:
    op.drop_constraint("ck_chat_history_owner_xor", "chat_history", type_="check")
    op.drop_index("ix_chat_history_guest_conversation_created", table_name="chat_history")
    op.drop_index("ix_chat_history_user_conversation_created", table_name="chat_history")
    op.drop_index("ix_chat_history_guest_session_id", table_name="chat_history")

    op.alter_column("chat_history", "user_id", existing_type=sa.String(length=36), nullable=False)
    op.drop_column("chat_history", "guest_session_id")
