"""Hukuki belge taslakları endpoint'leri."""
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

from schemas import TaslakBilgi, TaslakListResponse, TaslakOlusturRequest
from services.template_service import TEMPLATES, pdf_uret, zorunlu_alanlari_dogrula

router = APIRouter(prefix="/templates", tags=["templates"])


@router.get("", response_model=TaslakListResponse)
def taslak_listesi():
    """Mevcut hukuki belge taslakları ve gerekli alanları döndürür."""
    return TaslakListResponse(
        taslaklar=[TaslakBilgi(**t) for t in TEMPLATES.values()]
    )


@router.post("/{template_id}/generate")
@limiter.limit("20/minute")
def taslak_olustur(request: Request, template_id: str, body: TaslakOlusturRequest):
    """Doldurulmuş alanlarla PDF belgesi üretir."""
    if template_id not in TEMPLATES:
        raise HTTPException(status_code=404, detail=f"Taslak bulunamadı: {template_id}")

    eksikler = zorunlu_alanlari_dogrula(template_id, body.alanlar)
    if eksikler:
        raise HTTPException(
            status_code=422,
            detail=f"Zorunlu alanlar eksik: {', '.join(eksikler)}",
        )

    try:
        pdf_baytlari = pdf_uret(template_id, body.alanlar)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"PDF üretilemedi: {exc}") from exc

    return Response(
        content=pdf_baytlari,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{template_id}.pdf"'},
    )
