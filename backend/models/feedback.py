"""MessageFeedback ORM modeli — kullanıcı 👍/👎 oylaması."""
import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from db.base import Base


class MessageFeedback(Base):
    __tablename__ = "message_feedback"
    __table_args__ = (
        CheckConstraint("puan IN (1, -1)", name="ck_feedback_puan"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    message_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("chat_history.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # +1 = beğendi, -1 = beğenmedi
    puan: Mapped[int] = mapped_column(Integer, nullable=False)
    user_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    guest_session_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
