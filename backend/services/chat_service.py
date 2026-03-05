import uuid
from datetime import datetime

from sqlalchemy import func
from sqlalchemy.orm import Session

from models.chat_history import ChatHistory
from models.enums import MessageRole


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
) -> None:
    # Exactly one owner type must be set for each row.
    if (user_id is None) == (guest_session_id is None):
        raise ValueError("Exactly one of user_id or guest_session_id must be provided.")

    rows = [
        ChatHistory(
            user_id=user_id,
            guest_session_id=guest_session_id,
            conversation_id=conversation_id,
            role=MessageRole.USER,
            content=user_message,
            metadata_json=None,
        ),
        ChatHistory(
            user_id=user_id,
            guest_session_id=guest_session_id,
            conversation_id=conversation_id,
            role=MessageRole.ASSISTANT,
            content=assistant_message,
            metadata_json=None,
        ),
    ]
    db.add_all(rows)
    db.commit()


def list_user_messages(db: Session, user_id: str, conversation_id: str, limit: int, offset: int) -> tuple[list[ChatHistory], int]:
    base_query = db.query(ChatHistory).filter(
        ChatHistory.user_id == user_id,
        ChatHistory.conversation_id == conversation_id,
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
    )
    total = base_query.count()
    messages = (
        base_query.order_by(ChatHistory.created_at.asc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return messages, total


def list_user_conversations(db: Session, user_id: str, limit: int, offset: int) -> list[tuple[str, int, datetime]]:
    return (
        db.query(
            ChatHistory.conversation_id,
            func.count(ChatHistory.id).label("message_count"),
            func.max(ChatHistory.created_at).label("last_message_at"),
        )
        .filter(ChatHistory.user_id == user_id)
        .group_by(ChatHistory.conversation_id)
        .order_by(func.max(ChatHistory.created_at).desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


def count_user_conversations(db: Session, user_id: str) -> int:
    return (
        db.query(func.count(func.distinct(ChatHistory.conversation_id)))
        .filter(ChatHistory.user_id == user_id)
        .scalar()
        or 0
    )


def list_guest_conversations(db: Session, guest_session_id: str, limit: int, offset: int) -> list[tuple[str, int, datetime]]:
    return (
        db.query(
            ChatHistory.conversation_id,
            func.count(ChatHistory.id).label("message_count"),
            func.max(ChatHistory.created_at).label("last_message_at"),
        )
        .filter(ChatHistory.guest_session_id == guest_session_id)
        .group_by(ChatHistory.conversation_id)
        .order_by(func.max(ChatHistory.created_at).desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


def count_guest_conversations(db: Session, guest_session_id: str) -> int:
    return (
        db.query(func.count(func.distinct(ChatHistory.conversation_id)))
        .filter(ChatHistory.guest_session_id == guest_session_id)
        .scalar()
        or 0
    )
