import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from db.base import Base


class WeakQuery(Base):
    __tablename__ = "weak_queries"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    soru: Mapped[str] = mapped_column(Text, nullable=False)
    max_skor: Mapped[float] = mapped_column(Float, nullable=False)
    kategori: Mapped[str | None] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
