"""Cevap puanlama endpoint'leri."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user_optional
from db.session import get_db
from models.chat_history import ChatHistory
from models.user import User
from schemas import FeedbackCevap, FeedbackGonder
from services.feedback_service import feedback_kaydet

router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.post("", response_model=FeedbackCevap)
async def feedback_gonder(
    veri: FeedbackGonder,
    db: Session = Depends(get_db),
    mevcut_kullanici: User | None = Depends(get_current_user_optional),
):
    """Bir cevaba 👍 (+1) veya 👎 (-1) ver."""
    if not mevcut_kullanici and not veri.guest_session_id:
        raise HTTPException(
            status_code=400,
            detail="Kullanıcı girişi veya guest_session_id gereklidir",
        )

    mesaj = db.query(ChatHistory).filter(ChatHistory.id == veri.message_id).first()
    if not mesaj:
        raise HTTPException(status_code=404, detail="Mesaj bulunamadı")

    try:
        feedback_kaydet(
            db=db,
            message_id=veri.message_id,
            puan=veri.puan,
            user_id=str(mevcut_kullanici.id) if mevcut_kullanici else None,
            guest_session_id=veri.guest_session_id,
        )
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Feedback kaydedilemedi")

    return FeedbackCevap(basarili=True, mesaj="Geri bildirim kaydedildi")
