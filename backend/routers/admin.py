"""Admin analytics endpoint'leri — sadece ADMIN rolü."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from auth.dependencies import require_roles
from db.session import get_db
from models.enums import UserRole
from models.user import User
from schemas import (
    AdminFeedbackOzet,
    AdminGenelIstatistik,
    AdminGunlukAktiviteItem,
    AdminKategoriItem,
    AdminKullaniciItem,
    AdminKullaniciListeCevap,
    AdminRolGuncelle,
    AdminZayifSorguItem,
    AdminZayifSorguListeCevap,
)
from services.admin_service import (
    feedback_ozeti,
    genel_istatistikler,
    gunluk_aktivite,
    kategori_dagilimi,
    kullanici_askiya_al,
    kullanici_listesi,
    kullanici_rol_guncelle,
    zayif_sorgular_listele,
)

router = APIRouter(prefix="/admin", tags=["admin"])

_admin_required = require_roles([UserRole.ADMIN])


@router.get("/stats", response_model=AdminGenelIstatistik)
def admin_genel_istatistik(
    gun: int = Query(default=7, ge=1, le=90),
    db: Session = Depends(get_db),
    _: User = Depends(_admin_required),
):
    return AdminGenelIstatistik(**genel_istatistikler(db, gun))


@router.get("/stats/categories", response_model=list[AdminKategoriItem])
def admin_kategori_dagilimi(
    gun: int = Query(default=7, ge=1, le=90),
    db: Session = Depends(get_db),
    _: User = Depends(_admin_required),
):
    return [AdminKategoriItem(**row) for row in kategori_dagilimi(db, gun)]


@router.get("/stats/feedback", response_model=AdminFeedbackOzet)
def admin_feedback_ozeti(
    gun: int = Query(default=7, ge=1, le=90),
    db: Session = Depends(get_db),
    _: User = Depends(_admin_required),
):
    return AdminFeedbackOzet(**feedback_ozeti(db, gun))


@router.get("/stats/daily", response_model=list[AdminGunlukAktiviteItem])
def admin_gunluk_aktivite(
    gun: int = Query(default=7, ge=1, le=90),
    db: Session = Depends(get_db),
    _: User = Depends(_admin_required),
):
    return [AdminGunlukAktiviteItem(**row) for row in gunluk_aktivite(db, gun)]


@router.get("/users", response_model=AdminKullaniciListeCevap)
def admin_kullanici_listesi(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    q: str | None = Query(default=None, max_length=255),
    rol: UserRole | None = Query(default=None),
    aktif: bool | None = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(_admin_required),
):
    users, total = kullanici_listesi(db=db, limit=limit, offset=offset, q=q, rol=rol, aktif=aktif)
    return AdminKullaniciListeCevap(
        kullanicilar=[
            AdminKullaniciItem(
                id=u.id,
                email=u.email,
                role=u.role.value,
                is_active=u.is_active,
                created_at=u.created_at.isoformat(),
            )
            for u in users
        ],
        total=total,
    )


@router.patch("/users/{user_id}/role", response_model=AdminKullaniciItem)
def admin_rol_guncelle(
    user_id: str,
    body: AdminRolGuncelle,
    db: Session = Depends(get_db),
    current_admin: User = Depends(_admin_required),
):
    if user_id == current_admin.id:
        raise HTTPException(status_code=400, detail="Kendi rolünüzü değiştiremezsiniz.")
    try:
        user = kullanici_rol_guncelle(db=db, user_id=user_id, new_role=body.rol)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")
    return AdminKullaniciItem(id=user.id, email=user.email, role=user.role.value, is_active=user.is_active, created_at=user.created_at.isoformat())


@router.get("/weak-queries", response_model=AdminZayifSorguListeCevap)
def admin_zayif_sorgular(
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    _: User = Depends(_admin_required),
):
    rows, total = zayif_sorgular_listele(db=db, limit=limit, offset=offset)
    return AdminZayifSorguListeCevap(
        sorgular=[
            AdminZayifSorguItem(
                id=r.id,
                soru=r.soru,
                max_skor=round(r.max_skor, 4),
                kategori=r.kategori,
            )
            for r in rows
        ],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.patch("/users/{user_id}/status", response_model=AdminKullaniciItem)
def admin_kullanici_durum(
    user_id: str,
    aktif: bool = Query(...),
    db: Session = Depends(get_db),
    current_admin: User = Depends(_admin_required),
):
    if user_id == current_admin.id:
        raise HTTPException(status_code=400, detail="Kendi hesabınızı askıya alamazsınız.")
    user = kullanici_askiya_al(db=db, user_id=user_id, aktif=aktif)
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")
    return AdminKullaniciItem(id=user.id, email=user.email, role=user.role.value, is_active=user.is_active, created_at=user.created_at.isoformat())
