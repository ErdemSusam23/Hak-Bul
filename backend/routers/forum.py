"""Forum endpoint'leri."""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user, get_current_user_optional, require_roles
from db.session import get_db
from models.enums import ForumVoteType, UserRole
from models.user import User
from schemas import (
    ForumOyCevap,
    ForumOyGonder,
    ForumReplyGuncelle,
    ForumReplyItem,
    ForumReplyOlustur,
    ForumThreadDetay,
    ForumThreadGuncelle,
    ForumThreadItem,
    ForumThreadListeCevap,
    ForumThreadOlustur,
)
from services.forum_service import (
    oy_ver,
    thread_getir,
    thread_guncelle,
    thread_kilitle,
    thread_listele,
    thread_olustur,
    thread_sil,
    yanit_dogrula,
    yanit_getir,
    yanit_guncelle,
    yanit_listele,
    yanit_olustur,
    yanit_sil,
    _thread_to_dict,
    _reply_to_dict,
)

router = APIRouter(prefix="/forum", tags=["forum"])

_lawyer_or_admin = require_roles([UserRole.LAWYER, UserRole.ADMIN])


# ─── Thread endpoint'leri ────────────────────────────────────────────────────

@router.get("/threads", response_model=ForumThreadListeCevap)
def forum_thread_listele(
    category: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    threads, total = thread_listele(db=db, category=category, page=page, size=size)
    return ForumThreadListeCevap(threads=threads, total=total, page=page, size=size)


@router.post("/threads", response_model=ForumThreadItem, status_code=status.HTTP_201_CREATED)
def forum_thread_olustur(
    body: ForumThreadOlustur,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    thread = thread_olustur(
        db=db,
        user_id=current_user.id,
        title=body.title,
        content=body.content,
        category=body.category,
    )
    return _thread_to_dict(db, thread, current_user)


@router.get("/threads/{thread_id}", response_model=ForumThreadDetay)
def forum_thread_detay(
    thread_id: str,
    db: Session = Depends(get_db),
):
    thread = thread_getir(db, thread_id)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread bulunamadı.")
    from models.user import User as UserModel
    author = db.query(UserModel).filter(UserModel.id == thread.user_id).first()
    if not author:
        raise HTTPException(status_code=404, detail="Thread yazarı bulunamadı.")
    replies = yanit_listele(db, thread_id)
    return ForumThreadDetay(
        thread=_thread_to_dict(db, thread, author),
        replies=replies,
    )


@router.put("/threads/{thread_id}", response_model=ForumThreadItem)
def forum_thread_guncelle(
    thread_id: str,
    body: ForumThreadGuncelle,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    thread = thread_getir(db, thread_id)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread bulunamadı.")
    if thread.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Bu thread'i düzenleme yetkiniz yok.")
    updated = thread_guncelle(db, thread, body.title, body.content)
    return _thread_to_dict(db, updated, current_user)


@router.delete("/threads/{thread_id}", status_code=status.HTTP_204_NO_CONTENT)
def forum_thread_sil(
    thread_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    thread = thread_getir(db, thread_id)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread bulunamadı.")
    is_owner = thread.user_id == current_user.id
    is_moderator = current_user.role in (UserRole.LAWYER, UserRole.ADMIN)
    if not is_owner and not is_moderator:
        raise HTTPException(status_code=403, detail="Bu thread'i silme yetkiniz yok.")
    thread_sil(db, thread)


@router.patch("/threads/{thread_id}/lock", response_model=ForumThreadItem)
def forum_thread_kilitle(
    thread_id: str,
    locked: bool = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(_lawyer_or_admin),
):
    thread = thread_getir(db, thread_id)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread bulunamadı.")
    updated = thread_kilitle(db, thread, locked)
    from models.user import User as UserModel
    author = db.query(UserModel).filter(UserModel.id == updated.user_id).first()
    return _thread_to_dict(db, updated, author)


# ─── Reply endpoint'leri ─────────────────────────────────────────────────────

@router.post("/threads/{thread_id}/replies", response_model=ForumReplyItem, status_code=status.HTTP_201_CREATED)
def forum_yanit_olustur(
    thread_id: str,
    body: ForumReplyOlustur,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    thread = thread_getir(db, thread_id)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread bulunamadı.")
    if thread.is_locked:
        raise HTTPException(status_code=400, detail="Bu thread kilitli, yanıt yazılamaz.")
    reply = yanit_olustur(db=db, thread_id=thread_id, user_id=current_user.id, content=body.content)
    return _reply_to_dict(db, reply, current_user)


@router.put("/replies/{reply_id}", response_model=ForumReplyItem)
def forum_yanit_guncelle(
    reply_id: str,
    body: ForumReplyGuncelle,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    reply = yanit_getir(db, reply_id)
    if not reply:
        raise HTTPException(status_code=404, detail="Yanıt bulunamadı.")
    if reply.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Bu yanıtı düzenleme yetkiniz yok.")
    updated = yanit_guncelle(db, reply, body.content)
    return _reply_to_dict(db, updated, current_user)


@router.delete("/replies/{reply_id}", status_code=status.HTTP_204_NO_CONTENT)
def forum_yanit_sil(
    reply_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    reply = yanit_getir(db, reply_id)
    if not reply:
        raise HTTPException(status_code=404, detail="Yanıt bulunamadı.")
    is_owner = reply.user_id == current_user.id
    is_moderator = current_user.role in (UserRole.LAWYER, UserRole.ADMIN)
    if not is_owner and not is_moderator:
        raise HTTPException(status_code=403, detail="Bu yanıtı silme yetkiniz yok.")
    yanit_sil(db, reply)


@router.patch("/replies/{reply_id}/verify", response_model=ForumReplyItem)
def forum_yanit_dogrula(
    reply_id: str,
    verified: bool = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(_lawyer_or_admin),
):
    reply = yanit_getir(db, reply_id)
    if not reply:
        raise HTTPException(status_code=404, detail="Yanıt bulunamadı.")
    updated = yanit_dogrula(db, reply, verified)
    from models.user import User as UserModel
    author = db.query(UserModel).filter(UserModel.id == updated.user_id).first()
    return _reply_to_dict(db, updated, author)


# ─── Oy endpoint'leri ────────────────────────────────────────────────────────

@router.post("/threads/{thread_id}/vote", response_model=ForumOyCevap)
def forum_thread_oy(
    thread_id: str,
    body: ForumOyGonder,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    thread = thread_getir(db, thread_id)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread bulunamadı.")
    yeni_skor = oy_ver(
        db=db,
        user_id=current_user.id,
        target_type=ForumVoteType.THREAD.value,
        target_id=thread_id,
        value=body.value,
    )
    return ForumOyCevap(basarili=True, yeni_skor=yeni_skor)


@router.post("/replies/{reply_id}/vote", response_model=ForumOyCevap)
def forum_reply_oy(
    reply_id: str,
    body: ForumOyGonder,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    reply = yanit_getir(db, reply_id)
    if not reply:
        raise HTTPException(status_code=404, detail="Yanıt bulunamadı.")
    yeni_skor = oy_ver(
        db=db,
        user_id=current_user.id,
        target_type=ForumVoteType.REPLY.value,
        target_id=reply_id,
        value=body.value,
    )
    return ForumOyCevap(basarili=True, yeni_skor=yeni_skor)
