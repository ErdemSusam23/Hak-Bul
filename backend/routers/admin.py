"""Admin analytics endpoint'leri — sadece ADMIN rolü."""
from fastapi import APIRouter, Depends, Query
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
)
from services.admin_service import (
    feedback_ozeti,
    genel_istatistikler,
    gunluk_aktivite,
    kategori_dagilimi,
)

router = APIRouter(prefix="/admin", tags=["admin"])

_admin_required = require_roles([UserRole.ADMIN])


@router.get("/stats", response_model=AdminGenelIstatistik)
def admin_genel_istatistik(
    db: Session = Depends(get_db),
    _: User = Depends(_admin_required),
):
    return AdminGenelIstatistik(**genel_istatistikler(db))


@router.get("/stats/categories", response_model=list[AdminKategoriItem])
def admin_kategori_dagilimi(
    db: Session = Depends(get_db),
    _: User = Depends(_admin_required),
):
    return [AdminKategoriItem(**row) for row in kategori_dagilimi(db)]


@router.get("/stats/feedback", response_model=AdminFeedbackOzet)
def admin_feedback_ozeti(
    db: Session = Depends(get_db),
    _: User = Depends(_admin_required),
):
    return AdminFeedbackOzet(**feedback_ozeti(db))


@router.get("/stats/daily", response_model=list[AdminGunlukAktiviteItem])
def admin_gunluk_aktivite(
    gun: int = Query(default=7, ge=1, le=90),
    db: Session = Depends(get_db),
    _: User = Depends(_admin_required),
):
    return [AdminGunlukAktiviteItem(**row) for row in gunluk_aktivite(db, gun)]
