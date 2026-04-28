"""Forum is mantigi."""
from datetime import datetime
import unicodedata

from sqlalchemy import func
from sqlalchemy.orm import Session

from models.enums import ForumVoteType
from models.forum import ForumReply, ForumThread, ForumVote
from models.user import User

_CANONICAL_CATEGORIES = {
    "Genel",
    "İş Hukuku",
    "Medeni Hukuk",
    "Ceza Hukuku",
    "Ticaret Hukuku",
    "Tüketici Hukuku",
    "Taşınmaz Mülk",
    "İdare Hukuku",
    "Vergi Hukuku",
    "Sosyal Güvenlik",
    "Bilişim Hukuku",
}

_CATEGORY_ALIASES = {
    "genel": "Genel",
    "genel hukuk": "Genel",
    "is": "İş Hukuku",
    "is hukuku": "İş Hukuku",
    "medeni hukuk": "Medeni Hukuk",
    "ceza hukuk": "Ceza Hukuku",
    "ceza hukuku": "Ceza Hukuku",
    "ticaret hukuk": "Ticaret Hukuku",
    "ticaret hukuku": "Ticaret Hukuku",
    "tuketici hukuk": "Tüketici Hukuku",
    "tuketici hukuku": "Tüketici Hukuku",
    "tasinmaz mulk": "Taşınmaz Mülk",
    "gayrimenkul": "Taşınmaz Mülk",
    "idare hukuk": "İdare Hukuku",
    "idare hukuku": "İdare Hukuku",
    "vergi hukuk": "Vergi Hukuku",
    "vergi hukuku": "Vergi Hukuku",
    "sosyal guvenlik": "Sosyal Güvenlik",
    "bilisim hukuk": "Bilişim Hukuku",
    "bilisim hukuku": "Bilişim Hukuku",
}


def _ascii_key(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value.strip())
    without_marks = "".join(ch for ch in normalized if not unicodedata.combining(ch))
    return " ".join(without_marks.casefold().split())


def normalize_forum_category(category: str) -> str:
    key = _ascii_key(category)
    mapped = _CATEGORY_ALIASES.get(key)
    if mapped:
        return mapped

    for canonical in _CANONICAL_CATEGORIES:
        if _ascii_key(canonical) == key:
            return canonical

    raise ValueError("Geçersiz kategori.")


def to_canonical_category_or_none(category: str | None) -> str | None:
    if category is None:
        return None
    trimmed = category.strip()
    if not trimmed:
        return None
    return normalize_forum_category(trimmed)


def _display_name_for_user(user: User) -> str:
    role = user.role.value
    if role == "lawyer":
        return "Avukat"
    if role == "admin":
        return "Yönetici"
    return "Kullanıcı"


def _thread_to_dict(db: Session, thread: ForumThread, user: User) -> dict:
    reply_count = (
        db.query(func.count(ForumReply.id))
        .filter(ForumReply.thread_id == thread.id, ForumReply.deleted_at.is_(None))
        .scalar()
        or 0
    )
    vote_score = (
        db.query(func.sum(ForumVote.value))
        .filter(
            ForumVote.target_type == ForumVoteType.THREAD.value,
            ForumVote.target_id == thread.id,
        )
        .scalar()
        or 0
    )
    return {
        "id": thread.id,
        "title": thread.title,
        "content": thread.content,
        "category": thread.category,
        "is_locked": thread.is_locked,
        "user_id": thread.user_id,
        "display_name": _display_name_for_user(user),
        "reply_count": reply_count,
        "vote_score": vote_score,
        "created_at": thread.created_at.isoformat(),
        "updated_at": thread.updated_at.isoformat(),
    }


def _reply_to_dict(db: Session, reply: ForumReply, user: User) -> dict:
    vote_score = (
        db.query(func.sum(ForumVote.value))
        .filter(
            ForumVote.target_type == ForumVoteType.REPLY.value,
            ForumVote.target_id == reply.id,
        )
        .scalar()
        or 0
    )
    return {
        "id": reply.id,
        "thread_id": reply.thread_id,
        "content": reply.content,
        "is_verified": reply.is_verified,
        "user_id": reply.user_id,
        "display_name": _display_name_for_user(user),
        "user_role": user.role.value,
        "vote_score": vote_score,
        "created_at": reply.created_at.isoformat(),
        "updated_at": reply.updated_at.isoformat(),
    }


def thread_listele(
    db: Session,
    category: str | None = None,
    page: int = 1,
    size: int = 20,
) -> tuple[list[dict], int]:
    query = db.query(ForumThread).filter(ForumThread.deleted_at.is_(None))
    canonical_category = to_canonical_category_or_none(category)
    if canonical_category:
        query = query.filter(ForumThread.category == canonical_category)
    total = query.count()
    threads = (
        query.order_by(ForumThread.created_at.desc())
        .offset((page - 1) * size)
        .limit(size)
        .all()
    )
    result = []
    for thread in threads:
        user = db.query(User).filter(User.id == thread.user_id).first()
        if user:
            result.append(_thread_to_dict(db, thread, user))
    return result, total


def thread_olustur(
    db: Session,
    user_id: str,
    title: str,
    content: str,
    category: str,
) -> ForumThread:
    thread = ForumThread(
        user_id=user_id,
        title=title,
        content=content,
        category=normalize_forum_category(category),
    )
    db.add(thread)
    db.commit()
    db.refresh(thread)
    return thread


def thread_getir(db: Session, thread_id: str) -> ForumThread | None:
    return (
        db.query(ForumThread)
        .filter(ForumThread.id == thread_id, ForumThread.deleted_at.is_(None))
        .first()
    )


def thread_guncelle(
    db: Session,
    thread: ForumThread,
    title: str | None,
    content: str | None,
) -> ForumThread:
    if title is not None:
        thread.title = title
    if content is not None:
        thread.content = content
    thread.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(thread)
    return thread


def thread_sil(db: Session, thread: ForumThread) -> None:
    thread.deleted_at = datetime.utcnow()
    db.commit()


def thread_kilitle(db: Session, thread: ForumThread, is_locked: bool) -> ForumThread:
    thread.is_locked = is_locked
    db.commit()
    db.refresh(thread)
    return thread


def yanit_listele(db: Session, thread_id: str) -> list[dict]:
    replies = (
        db.query(ForumReply)
        .filter(ForumReply.thread_id == thread_id, ForumReply.deleted_at.is_(None))
        .order_by(ForumReply.is_verified.desc(), ForumReply.created_at.asc())
        .all()
    )
    result = []
    for reply in replies:
        user = db.query(User).filter(User.id == reply.user_id).first()
        if user:
            result.append(_reply_to_dict(db, reply, user))
    return result


def yanit_olustur(db: Session, thread_id: str, user_id: str, content: str) -> ForumReply:
    reply = ForumReply(thread_id=thread_id, user_id=user_id, content=content)
    db.add(reply)
    db.commit()
    db.refresh(reply)
    return reply


def yanit_getir(db: Session, reply_id: str) -> ForumReply | None:
    return (
        db.query(ForumReply)
        .filter(ForumReply.id == reply_id, ForumReply.deleted_at.is_(None))
        .first()
    )


def yanit_guncelle(db: Session, reply: ForumReply, content: str) -> ForumReply:
    reply.content = content
    reply.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(reply)
    return reply


def yanit_sil(db: Session, reply: ForumReply) -> None:
    reply.deleted_at = datetime.utcnow()
    db.commit()


def yanit_dogrula(db: Session, reply: ForumReply, is_verified: bool) -> ForumReply:
    reply.is_verified = is_verified
    db.commit()
    db.refresh(reply)
    return reply


def oy_ver(db: Session, user_id: str, target_type: str, target_id: str, value: int) -> int:
    """Oy ekler veya gunceller. Yeni toplam skoru dondurur."""
    mevcut = (
        db.query(ForumVote)
        .filter(
            ForumVote.user_id == user_id,
            ForumVote.target_type == target_type,
            ForumVote.target_id == target_id,
        )
        .first()
    )
    if mevcut:
        mevcut.value = value
    else:
        db.add(
            ForumVote(
                user_id=user_id,
                target_type=target_type,
                target_id=target_id,
                value=value,
            )
        )
    db.commit()

    skor = (
        db.query(func.sum(ForumVote.value))
        .filter(
            ForumVote.target_type == target_type,
            ForumVote.target_id == target_id,
        )
        .scalar()
        or 0
    )
    return skor
