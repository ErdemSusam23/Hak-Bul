import uuid
from datetime import datetime
import logging
from time import perf_counter

from sqlalchemy import func
from sqlalchemy.orm import Session

from config import settings
from models.chat_history import ChatHistory
from models.enums import MessageRole
from models.shared_conversation import SharedConversation

logger = logging.getLogger(__name__)
perf_logger = logging.getLogger("uvicorn.error")


def resolve_conversation_id(conversation_id: str | None) -> str:
    return conversation_id if conversation_id else str(uuid.uuid4())


def resolve_guest_session_id(guest_session_id: str | None) -> str:
    return guest_session_id if guest_session_id else str(uuid.uuid4())


def save_chat_pair(
    db: Session,
    conversation_id: str,
    user_message: str,
    assistant_message: str,
    user_id: str | None = None,
    guest_session_id: str | None = None,
    category: str | None = None,
    kaynaklar: list | None = None,
    request_id: str | None = None,
) -> str:
    """Kullanıcı ve asistan mesajlarını kaydeder. Asistan mesajının ID'sini döndürür."""
    total_started_at = perf_counter()
    # Exactly one owner type must be set for each row.
    if (user_id is None) == (guest_session_id is None):
        raise ValueError("Exactly one of user_id or guest_session_id must be provided.")

    # İlk mesajsa title oluştur (60 karakter, kelime ortasında kesmez)
    first_check_started_at = perf_counter()
    filters = [ChatHistory.conversation_id == conversation_id, ChatHistory.deleted_at.is_(None)]
    if user_id:
        filters.append(ChatHistory.user_id == user_id)
    else:
        filters.append(ChatHistory.guest_session_id == guest_session_id)
    is_first = db.query(ChatHistory.id).filter(*filters).first() is None
    first_check_ms = (perf_counter() - first_check_started_at) * 1000
    title = (user_message[:60].rsplit(" ", 1)[0] if len(user_message) > 60 else user_message) if is_first else None

    assistant_row = ChatHistory(
        user_id=user_id,
        guest_session_id=guest_session_id,
        conversation_id=conversation_id,
        role=MessageRole.ASSISTANT,
        content=assistant_message,
        title=title,
        category=category,
        metadata_json={"kaynaklar": kaynaklar} if kaynaklar else None,
    )
    rows = [
        ChatHistory(
            user_id=user_id,
            guest_session_id=guest_session_id,
            conversation_id=conversation_id,
            role=MessageRole.USER,
            content=user_message,
            title=title,
            category=category,
            metadata_json=None,
        ),
        assistant_row,
    ]
    db.add_all(rows)
    commit_started_at = perf_counter()
    db.commit()
    commit_ms = (perf_counter() - commit_started_at) * 1000
    if settings.PERF_LOG_ENABLED:
        perf_logger.info(
            "[perf][%s] save_chat_pair total_ms=%.1f first_check_ms=%.1f commit_ms=%.1f is_first=%s sources=%s",
            request_id or "-",
            (perf_counter() - total_started_at) * 1000,
            first_check_ms,
            commit_ms,
            is_first,
            len(kaynaklar or []),
        )
    return assistant_row.id


def list_user_messages(db: Session, user_id: str, conversation_id: str, limit: int, offset: int) -> tuple[list[ChatHistory], int]:
    base_query = db.query(ChatHistory).filter(
        ChatHistory.user_id == user_id,
        ChatHistory.conversation_id == conversation_id,
        ChatHistory.deleted_at.is_(None),
    )
    total = base_query.count()
    messages = (
        base_query.order_by(ChatHistory.created_at.asc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return messages, total


def list_guest_messages(
    db: Session, guest_session_id: str, conversation_id: str, limit: int, offset: int
) -> tuple[list[ChatHistory], int]:
    base_query = db.query(ChatHistory).filter(
        ChatHistory.guest_session_id == guest_session_id,
        ChatHistory.conversation_id == conversation_id,
        ChatHistory.deleted_at.is_(None),
    )
    total = base_query.count()
    messages = (
        base_query.order_by(ChatHistory.created_at.asc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return messages, total


def list_user_conversations(db: Session, user_id: str, limit: int, offset: int) -> list[tuple[str, int, datetime, str | None]]:
    return (
        db.query(
            ChatHistory.conversation_id,
            func.count(ChatHistory.id).label("message_count"),
            func.max(ChatHistory.created_at).label("last_message_at"),
            func.max(ChatHistory.title).label("title"),
        )
        .filter(ChatHistory.user_id == user_id, ChatHistory.deleted_at.is_(None))
        .group_by(ChatHistory.conversation_id)
        .order_by(func.max(ChatHistory.created_at).desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


def count_user_conversations(db: Session, user_id: str) -> int:
    return (
        db.query(func.count(func.distinct(ChatHistory.conversation_id)))
        .filter(ChatHistory.user_id == user_id, ChatHistory.deleted_at.is_(None))
        .scalar()
        or 0
    )


def list_guest_conversations(db: Session, guest_session_id: str, limit: int, offset: int) -> list[tuple[str, int, datetime, str | None]]:
    return (
        db.query(
            ChatHistory.conversation_id,
            func.count(ChatHistory.id).label("message_count"),
            func.max(ChatHistory.created_at).label("last_message_at"),
            func.max(ChatHistory.title).label("title"),
        )
        .filter(ChatHistory.guest_session_id == guest_session_id, ChatHistory.deleted_at.is_(None))
        .group_by(ChatHistory.conversation_id)
        .order_by(func.max(ChatHistory.created_at).desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


def count_guest_conversations(db: Session, guest_session_id: str) -> int:
    return (
        db.query(func.count(func.distinct(ChatHistory.conversation_id)))
        .filter(ChatHistory.guest_session_id == guest_session_id, ChatHistory.deleted_at.is_(None))
        .scalar()
        or 0
    )


def get_conversation_messages_for_export(
    db: Session, user_id: str, conversation_id: str
) -> list[ChatHistory]:
    """Sohbeti PDF olarak dışa aktarmak için tüm mesajları döndürür."""
    return (
        db.query(ChatHistory)
        .filter(
            ChatHistory.user_id == user_id,
            ChatHistory.conversation_id == conversation_id,
            ChatHistory.deleted_at.is_(None),
        )
        .order_by(ChatHistory.created_at.asc())
        .all()
    )


def delete_user_conversation(db: Session, user_id: str, conversation_id: str) -> bool:
    """Kullanıcıya ait sohbeti soft-delete yapar. True döner → silindi, False → bulunamadı."""
    updated = (
        db.query(ChatHistory)
        .filter(
            ChatHistory.user_id == user_id,
            ChatHistory.conversation_id == conversation_id,
            ChatHistory.deleted_at.is_(None),
        )
        .update({"deleted_at": datetime.utcnow()}, synchronize_session=False)
    )
    if updated > 0:
        db.query(SharedConversation).filter(
            SharedConversation.conversation_id == conversation_id
        ).update({"is_active": False}, synchronize_session=False)
    db.commit()
    return updated > 0


def delete_guest_conversation(db: Session, guest_session_id: str, conversation_id: str) -> bool:
    """Misafire ait sohbeti soft-delete yapar."""
    updated = (
        db.query(ChatHistory)
        .filter(
            ChatHistory.guest_session_id == guest_session_id,
            ChatHistory.conversation_id == conversation_id,
            ChatHistory.deleted_at.is_(None),
        )
        .update({"deleted_at": datetime.utcnow()}, synchronize_session=False)
    )
    db.commit()
    return updated > 0


def rename_user_conversation(db: Session, user_id: str, conversation_id: str, new_title: str) -> bool:
    """Sohbetin tüm mesajlarındaki title alanını günceller."""
    updated = (
        db.query(ChatHistory)
        .filter(
            ChatHistory.user_id == user_id,
            ChatHistory.conversation_id == conversation_id,
            ChatHistory.deleted_at.is_(None),
        )
        .update({"title": new_title[:80]}, synchronize_session=False)
    )
    db.commit()
    return updated > 0
