import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, Enum, ForeignKey, Index, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.base import Base
from models.enums import MessageRole


class ChatHistory(Base):
    __tablename__ = "chat_history"
    __table_args__ = (
        CheckConstraint(
            "(user_id IS NOT NULL) <> (guest_session_id IS NOT NULL)",
            name="ck_chat_history_owner_xor",
        ),
        Index("ix_chat_history_user_conversation_created", "user_id", "conversation_id", "created_at"),
        Index("ix_chat_history_guest_conversation_created", "guest_session_id", "conversation_id", "created_at"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=True
    )
    guest_session_id: Mapped[str | None] = mapped_column(String(36), index=True, nullable=True)
    conversation_id: Mapped[str] = mapped_column(String(36), index=True, default=lambda: str(uuid.uuid4()))
    role: Mapped[MessageRole] = mapped_column(
        Enum(MessageRole, values_callable=lambda enum_cls: [item.value for item in enum_cls], name="messagerole"),
        nullable=False,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str | None] = mapped_column(String(50), nullable=True)
    metadata_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="chat_history")
