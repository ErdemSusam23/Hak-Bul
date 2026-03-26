"""PDF upload and document analysis endpoints."""

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user_optional
from db.session import get_db
from models.user import User
from rag.generator import generate_document_answer, generate_document_compare_answer
from rag.pipeline import retrieve_context
from schemas import DokumanAnalizCevap
from services.chat_service import resolve_conversation_id, resolve_guest_session_id, save_chat_pair
from services.document_service import document_preview, pdf_metin_cikar
from services.language_service import (
    default_compare_question,
    default_document_question,
    informational_warning,
    normalize_language,
    pick_text,
)

limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/documents", tags=["documents"])

IZIN_VERILEN_TIPLER = {"application/pdf", "application/x-pdf"}


def _raise_generation_http_error(exc: RuntimeError) -> None:
    detail = str(exc)
    if "Groq" in detail:
        raise HTTPException(
            status_code=503,
            detail={
                "error": "upstream_unavailable",
                "detail": detail,
                "retry_after": 30,
            },
        ) from exc
    raise HTTPException(status_code=500, detail=detail) from exc


@router.post("/analyze", response_model=DokumanAnalizCevap)
@limiter.limit("10/minute")
async def dokuman_analiz_et(
    request: Request,
    dosya: UploadFile = File(...),
    soru: str | None = Form(default=None),
    language: str = Form(default="tr"),
    conversation_id: str | None = Form(default=None),
    guest_session_id: str | None = Form(default=None),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    """Upload a PDF and analyze it directly, with optional legal source support."""
    language = normalize_language(language)

    if dosya.content_type not in IZIN_VERILEN_TIPLER and not (dosya.filename or "").endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail=pick_text(language, "Sadece PDF dosyalari kabul edilir", "Only PDF files are accepted"),
        )

    pdf_baytlari = await dosya.read()

    try:
        belge_metni = pdf_metin_cikar(pdf_baytlari)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not belge_metni.strip():
        raise HTTPException(
            status_code=400,
            detail=pick_text(
                language,
                "PDF'den metin cikarilamadi (taranmis goruntu olabilir)",
                "No text could be extracted from the PDF (it may be a scanned image)",
            ),
        )

    etkili_soru = (soru or "").strip() or default_document_question(language)
    context = retrieve_context(etkili_soru, max_kaynak=3)

    try:
        yanit = generate_document_answer(
            soru=etkili_soru,
            belge_metni=belge_metni,
            chunks=context["chunks"],
            language=language,
            belge_adi=dosya.filename,
        )
    except RuntimeError as exc:
        _raise_generation_http_error(exc)

    ozet = document_preview(belge_metni)
    kategori = context["kategori"]
    kaynaklar = context["kaynaklar"]
    uyari = informational_warning(language)
    resolved_conv = resolve_conversation_id(conversation_id)
    resolved_guest: str | None = None
    message_id: str | None = None

    if current_user:
        message_id = save_chat_pair(
            db=db,
            conversation_id=resolved_conv,
            user_id=current_user.id,
            user_message=f"[PDF: {dosya.filename}] {etkili_soru}",
            assistant_message=yanit,
            category=kategori,
            kaynaklar=kaynaklar,
        )
    else:
        resolved_guest = resolve_guest_session_id(guest_session_id)
        message_id = save_chat_pair(
            db=db,
            conversation_id=resolved_conv,
            guest_session_id=resolved_guest,
            user_message=f"[PDF: {dosya.filename}] {etkili_soru}",
            assistant_message=yanit,
            category=kategori,
            kaynaklar=kaynaklar,
        )

    return DokumanAnalizCevap(
        yanit=yanit,
        belge_ozeti=ozet,
        kaynaklar=kaynaklar,
        kategori=kategori,
        conversation_id=resolved_conv,
        guest_session_id=resolved_guest,
        message_id=message_id,
        uyari=uyari,
    )


@router.post("/compare")
@limiter.limit("5/minute")
async def dokuman_karsilastir(
    request: Request,
    dosya1: UploadFile = File(...),
    dosya2: UploadFile = File(...),
    soru: str | None = Form(default=None),
    language: str = Form(default="tr"),
):
    """Upload two PDFs and compare them directly."""
    language = normalize_language(language)

    for dosya in (dosya1, dosya2):
        if dosya.content_type not in IZIN_VERILEN_TIPLER and not (dosya.filename or "").endswith(".pdf"):
            raise HTTPException(
                status_code=400,
                detail=pick_text(language, "Sadece PDF dosyalari kabul edilir", "Only PDF files are accepted"),
            )

    bayt1 = await dosya1.read()
    bayt2 = await dosya2.read()

    try:
        metin1 = pdf_metin_cikar(bayt1)
        metin2 = pdf_metin_cikar(bayt2)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not metin1.strip():
        raise HTTPException(
            status_code=400,
            detail=pick_text(
                language,
                f"{dosya1.filename}: PDF'den metin cikarilamadi",
                f"{dosya1.filename}: no text could be extracted from the PDF",
            ),
        )
    if not metin2.strip():
        raise HTTPException(
            status_code=400,
            detail=pick_text(
                language,
                f"{dosya2.filename}: PDF'den metin cikarilamadi",
                f"{dosya2.filename}: no text could be extracted from the PDF",
            ),
        )

    etkili_soru = (soru or "").strip() or default_compare_question(language)
    context = retrieve_context(etkili_soru, max_kaynak=2)

    try:
        yanit = generate_document_compare_answer(
            soru=etkili_soru,
            belge1_metni=metin1,
            belge2_metni=metin2,
            chunks=context["chunks"],
            language=language,
            belge1_adi=dosya1.filename,
            belge2_adi=dosya2.filename,
        )
    except RuntimeError as exc:
        _raise_generation_http_error(exc)

    return JSONResponse(
        {
            "yanit": yanit,
            "belge1_ozet": document_preview(metin1, max_chars=220),
            "belge2_ozet": document_preview(metin2, max_chars=220),
            "kaynaklar": context["kaynaklar"],
            "kategori": context["kategori"],
            "uyari": informational_warning(language),
        }
    )
