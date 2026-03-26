"""Legal document template endpoints."""

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import Response
from slowapi import Limiter
from slowapi.util import get_remote_address

from schemas import TaslakBilgi, TaslakListResponse, TaslakOlusturRequest
from services.language_service import normalize_language, pick_text
from services.template_service import _localized_template, get_templates, pdf_uret, zorunlu_alanlari_dogrula

limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/templates", tags=["templates"])


@router.get("", response_model=TaslakListResponse)
def taslak_listesi(language: str = Query(default="tr")):
    """Return available legal document templates and their required fields."""
    language = normalize_language(language)
    return TaslakListResponse(
        taslaklar=[TaslakBilgi(**t) for t in get_templates(language)]
    )


@router.post("/{template_id}/generate")
@limiter.limit("20/minute")
def taslak_olustur(request: Request, template_id: str, body: TaslakOlusturRequest):
    """Generate a PDF from the supplied template fields."""
    language = normalize_language(body.language)
    if not _localized_template(template_id, language):
        raise HTTPException(
            status_code=404,
            detail=pick_text(
                language,
                f"Taslak bulunamadi: {template_id}",
                f"Template not found: {template_id}",
            ),
        )

    eksikler = zorunlu_alanlari_dogrula(template_id, body.alanlar, language=language)
    if eksikler:
        raise HTTPException(
            status_code=422,
            detail=pick_text(
                language,
                f"Zorunlu alanlar eksik: {', '.join(eksikler)}",
                f"Missing required fields: {', '.join(eksikler)}",
            ),
        )

    try:
        pdf_baytlari = pdf_uret(template_id, body.alanlar, language=language)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=pick_text(
                language,
                f"PDF uretilemedi: {exc}",
                f"PDF could not be generated: {exc}",
            ),
        ) from exc

    return Response(
        content=pdf_baytlari,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{template_id}.pdf"'},
    )
