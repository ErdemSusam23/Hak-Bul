"""Admin analytics sorguları."""
from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from models.chat_history import ChatHistory
from models.enums import MessageRole, UserRole
from models.feedback import MessageFeedback
from models.user import User
from models.weak_query import WeakQuery


def _period_start(gun: int) -> datetime:
    return datetime.utcnow() - timedelta(days=gun)


def genel_istatistikler(db: Session, gun: int) -> dict:
    baslangic = _period_start(gun)
    toplam_kullanici = (
        db.query(func.count(User.id))
        .filter(
            User.role == UserRole.USER,
            User.created_at >= baslangic,
        )
        .scalar()
        or 0
    )
    toplam_mesaj = (
        db.query(func.count(ChatHistory.id))
        .filter(ChatHistory.created_at >= baslangic)
        .scalar()
        or 0
    )
    toplam_konusma = (
        db.query(func.count(func.distinct(ChatHistory.conversation_id)))
        .filter(ChatHistory.created_at >= baslangic)
        .scalar()
        or 0
    )
    toplam_begeni = (
        db.query(func.count(MessageFeedback.id))
        .filter(
            MessageFeedback.puan == 1,
            MessageFeedback.created_at >= baslangic,
        )
        .scalar()
        or 0
    )
    toplam_begenmeme = (
        db.query(func.count(MessageFeedback.id))
        .filter(
            MessageFeedback.puan == -1,
            MessageFeedback.created_at >= baslangic,
        )
        .scalar()
        or 0
    )
    return {
        "toplam_kullanici": toplam_kullanici,
        "toplam_mesaj": toplam_mesaj,
        "toplam_konusma": toplam_konusma,
        "toplam_begeni": toplam_begeni,
        "toplam_begenmeme": toplam_begenmeme,
    }


def kategori_dagilimi(db: Session, gun: int) -> list[dict]:
    baslangic = _period_start(gun)
    satirlar = (
        db.query(
            ChatHistory.category,
            func.count(ChatHistory.id).label("sayi"),
        )
        .filter(
            ChatHistory.created_at >= baslangic,
            ChatHistory.role == MessageRole.USER,
            ChatHistory.category.isnot(None),
        )
        .group_by(ChatHistory.category)
        .order_by(func.count(ChatHistory.id).desc())
        .all()
    )
    return [{"kategori": kategori or "Genel Hukuk", "sayi": sayi} for kategori, sayi in satirlar]


def feedback_ozeti(db: Session, gun: int) -> dict:
    baslangic = _period_start(gun)
    toplam_begeni = (
        db.query(func.count(MessageFeedback.id))
        .filter(
            MessageFeedback.puan == 1,
            MessageFeedback.created_at >= baslangic,
        )
        .scalar()
        or 0
    )
    toplam_begenmeme = (
        db.query(func.count(MessageFeedback.id))
        .filter(
            MessageFeedback.puan == -1,
            MessageFeedback.created_at >= baslangic,
        )
        .scalar()
        or 0
    )
    toplam = toplam_begeni + toplam_begenmeme
    oran = round(toplam_begeni / toplam * 100, 1) if toplam > 0 else None
    return {
        "begeni": toplam_begeni,
        "begenmeme": toplam_begenmeme,
        "toplam": toplam,
        "begeni_orani": oran,
    }


def kullanici_listesi(
    db: Session,
    limit: int = 50,
    offset: int = 0,
    q: str | None = None,
    rol: UserRole | None = None,
    aktif: bool | None = None,
) -> tuple[list[User], int]:
    query = db.query(User)

    if q and q.strip():
        arama = f"%{q.strip().lower()}%"
        query = query.filter(func.lower(User.email).like(arama))

    if rol is not None:
        query = query.filter(User.role == rol)

    if aktif is not None:
        query = query.filter(User.is_active.is_(aktif))

    total = query.count()
    users = (
        query.order_by(User.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return users, total


def kullanici_rol_guncelle(db: Session, user_id: str, new_role: str) -> User | None:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None
    from models.enums import UserRole
    try:
        user.role = UserRole(new_role)
    except ValueError:
        raise ValueError(f"Geçersiz rol: {new_role}")
    db.commit()
    db.refresh(user)
    return user


def kullanici_askiya_al(db: Session, user_id: str, aktif: bool) -> User | None:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None
    user.is_active = aktif
    db.commit()
    db.refresh(user)
    return user


def zayif_sorgular_listele(db: Session, limit: int = 100, offset: int = 0) -> tuple[list[WeakQuery], int]:
    query = db.query(WeakQuery)
    total = query.count()
    rows = (
        query
        .order_by(WeakQuery.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return rows, total


def zayif_sorgu_kaydet(db: Session, soru: str, max_skor: float, kategori: str | None) -> None:
    db.add(WeakQuery(soru=soru, max_skor=max_skor, kategori=kategori))
    db.commit()


def gunluk_aktivite(db: Session, gun: int) -> list[dict]:
    baslangic = _period_start(gun)
    satirlar = (
        db.query(
            func.date(ChatHistory.created_at).label("tarih"),
            func.count(ChatHistory.id).label("mesaj_sayisi"),
            func.count(func.distinct(ChatHistory.conversation_id)).label("konusma_sayisi"),
            func.count(func.distinct(ChatHistory.user_id)).label("kullanici_sayisi"),
        )
        .filter(
            ChatHistory.created_at >= baslangic,
            ChatHistory.role == MessageRole.USER,
        )
        .group_by(func.date(ChatHistory.created_at))
        .order_by(func.date(ChatHistory.created_at).asc())
        .all()
    )
    return [
        {
            "tarih": str(tarih),
            "mesaj_sayisi": mesaj,
            "konusma_sayisi": konusma,
            "kullanici_sayisi": kullanici,
        }
        for tarih, mesaj, konusma, kullanici in satirlar
    ]
