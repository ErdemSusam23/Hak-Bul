from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user
from db.session import get_db
from models.user import User
from schemas import ChatHistoryResponse, ChatMessageItem, ConversationListResponse, ConversationSummary
from services.chat_service import (
    count_guest_conversations,
    count_user_conversations,
    list_guest_conversations,
    list_guest_messages,
    list_user_conversations,
    list_user_messages,
)

router = APIRouter(prefix="/chat", tags=["chat"])


@router.get("/history/{conversation_id}", response_model=ChatHistoryResponse)
def get_user_chat_history(
    conversation_id: str,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    messages, total = list_user_messages(
        db=db,
        user_id=current_user.id,
        conversation_id=conversation_id,
        limit=limit,
        offset=offset,
    )
    return ChatHistoryResponse(
        messages=[
            ChatMessageItem(
                id=row.id,
                conversation_id=row.conversation_id,
                role=row.role.value,
                content=row.content,
                created_at=row.created_at.isoformat(),
                kaynaklar=row.metadata_json.get("kaynaklar") if row.metadata_json else None,
            )
            for row in messages
        ],
        total=total,
    )


@router.get("/conversations", response_model=ConversationListResponse)
def get_user_conversations(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = list_user_conversations(db=db, user_id=current_user.id, limit=limit, offset=offset)
    total = count_user_conversations(db=db, user_id=current_user.id)
    return ConversationListResponse(
        conversations=[
            ConversationSummary(
                conversation_id=conversation_id,
                message_count=message_count,
                last_message_at=last_message_at.isoformat(),
                title=title,
            )
            for conversation_id, message_count, last_message_at, title in rows
        ],
        total=total,
    )


@router.get("/guest/history/{conversation_id}", response_model=ChatHistoryResponse)
def get_guest_chat_history(
    conversation_id: str,
    guest_session_id: str = Query(..., min_length=36, max_length=36),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    messages, total = list_guest_messages(
        db=db,
        guest_session_id=guest_session_id,
        conversation_id=conversation_id,
        limit=limit,
        offset=offset,
    )
    return ChatHistoryResponse(
        messages=[
            ChatMessageItem(
                id=row.id,
                conversation_id=row.conversation_id,
                role=row.role.value,
                content=row.content,
                created_at=row.created_at.isoformat(),
                kaynaklar=row.metadata_json.get("kaynaklar") if row.metadata_json else None,
            )
            for row in messages
        ],
        total=total,
    )


@router.get("/guest/conversations", response_model=ConversationListResponse)
def get_guest_conversations(
    guest_session_id: str = Query(..., min_length=36, max_length=36),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    rows = list_guest_conversations(db=db, guest_session_id=guest_session_id, limit=limit, offset=offset)
    total = count_guest_conversations(db=db, guest_session_id=guest_session_id)
    return ConversationListResponse(
        conversations=[
            ConversationSummary(
                conversation_id=conversation_id,
                message_count=message_count,
                last_message_at=last_message_at.isoformat(),
                title=title,
            )
            for conversation_id, message_count, last_message_at, title in rows
        ],
        total=total,
    )
