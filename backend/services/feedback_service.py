"""Feedback kaydetme ve istatistik servisi."""
from sqlalchemy import func
from sqlalchemy.orm import Session

from models.feedback import MessageFeedback


def feedback_kaydet(
    db: Session,
    message_id: str,
    puan: int,
    user_id: str | None = None,
    guest_session_id: str | None = None,
) -> MessageFeedback:
    """Mevcut feedback varsa güncelle, yoksa oluştur."""
    filtre = {"message_id": message_id}
    if user_id:
        filtre["user_id"] = user_id
    elif guest_session_id:
        filtre["guest_session_id"] = guest_session_id

    mevcut = db.query(MessageFeedback).filter_by(**filtre).first()
    if mevcut:
        mevcut.puan = puan
        db.commit()
        return mevcut

    yeni = MessageFeedback(
        message_id=message_id,
        puan=puan,
        user_id=user_id,
        guest_session_id=guest_session_id,
    )
    db.add(yeni)
    db.commit()
    db.refresh(yeni)
    return yeni


def mesaj_puani_getir(db: Session, message_id: str) -> dict:
    """Bir mesajın toplam puanını döndür."""
    sonuc = (
        db.query(func.sum(MessageFeedback.puan))
        .filter(MessageFeedback.message_id == message_id)
        .scalar()
    )
    return {"message_id": message_id, "toplam_puan": sonuc or 0}
