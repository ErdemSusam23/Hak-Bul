"""Cevap puanlama endpoint'leri."""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user_optional
from auth.guest_session import require_guest_session_id
from db.session import get_db
from models.chat_history import ChatHistory
from models.enums import MessageRole
from models.user import User
from schemas import FeedbackCevap, FeedbackGonder
from services.feedback_service import feedback_kaydet

router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.post("", response_model=FeedbackCevap)
async def feedback_gonder(
    veri: FeedbackGonder,
    request: Request,
    db: Session = Depends(get_db),
    mevcut_kullanici: User | None = Depends(get_current_user_optional),
):
    """Bir cevaba +1 veya -1 geri bildirim ver."""
    guest_session_id = None
    if not mevcut_kullanici:
        guest_session_id = require_guest_session_id(request)

    mesaj = (
        db.query(ChatHistory)
        .filter(ChatHistory.id == veri.message_id, ChatHistory.deleted_at.is_(None))
        .first()
    )
    if not mesaj:
        raise HTTPException(status_code=404, detail="Mesaj bulunamadı")
    if mesaj.role != MessageRole.ASSISTANT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sadece asistan mesajları puanlanabilir.",
        )

    if mevcut_kullanici and mesaj.user_id != str(mevcut_kullanici.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu mesaja oy verme yetkiniz yok.",
        )
    if not mevcut_kullanici and mesaj.guest_session_id != guest_session_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu mesaja oy verme yetkiniz yok.",
        )

    try:
        feedback_kaydet(
            db=db,
            message_id=veri.message_id,
            puan=veri.puan,
            user_id=str(mevcut_kullanici.id) if mevcut_kullanici else None,
            guest_session_id=guest_session_id,
        )
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Feedback kaydedilemedi")

    return FeedbackCevap(basarili=True, mesaj="Geri bildirim kaydedildi")
