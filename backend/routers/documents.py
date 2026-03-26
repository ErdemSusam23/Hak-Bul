"""PDF yükleme ve hukuki analiz endpoint'leri."""
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

limiter = Limiter(key_func=get_remote_address)

from auth.dependencies import get_current_user_optional
from db.session import get_db
from models.user import User
from rag.pipeline import run_pipeline
from schemas import DokumanAnalizCevap
from services.document_service import dokuman_analiz_sorusu_hazirla, pdf_metin_cikar
from services.chat_service import resolve_conversation_id, resolve_guest_session_id, save_chat_pair

router = APIRouter(prefix="/documents", tags=["documents"])

IZIN_VERILEN_TIPLER = {"application/pdf", "application/x-pdf"}


@router.post("/analyze", response_model=DokumanAnalizCevap)
@limiter.limit("10/minute")
async def dokuman_analiz_et(
    request: Request,
    dosya: UploadFile = File(...),
    soru: str = Form(default="Bu belgede dikkat etmem gereken önemli maddeler nelerdir?"),
    conversation_id: str | None = Form(default=None),
    guest_session_id: str | None = Form(default=None),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    """PDF yükle ve hukuki analiz yap."""
    if dosya.content_type not in IZIN_VERILEN_TIPLER and not (dosya.filename or "").endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Sadece PDF dosyaları kabul edilir")

    pdf_baytlari = await dosya.read()

    try:
        belge_metni = pdf_metin_cikar(pdf_baytlari)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not belge_metni.strip():
        raise HTTPException(
            status_code=400,
            detail="PDF'den metin çıkarılamadı (taranmış görüntü olabilir)",
        )

    zengin_soru = dokuman_analiz_sorusu_hazirla(belge_metni, soru)
    sonuc = run_pipeline(soru=zengin_soru, max_kaynak=5)

    ozet = belge_metni[:300].replace("\n", " ").strip() + "..."
    kategori = sonuc.get("kategori", "Genel Hukuk")
    kaynaklar = sonuc.get("kaynaklar", [])

    # Sohbet geçmişine kaydet
    resolved_conv = resolve_conversation_id(conversation_id)
    if current_user:
        save_chat_pair(
            db=db,
            conversation_id=resolved_conv,
            user_id=current_user.id,
            user_message=f"[PDF: {dosya.filename}] {soru}",
            assistant_message=sonuc["yanit"],
            category=kategori,
            kaynaklar=kaynaklar,
        )
    elif guest_session_id:
        resolved_guest = resolve_guest_session_id(guest_session_id)
        save_chat_pair(
            db=db,
            conversation_id=resolved_conv,
            guest_session_id=resolved_guest,
            user_message=f"[PDF: {dosya.filename}] {soru}",
            assistant_message=sonuc["yanit"],
            category=kategori,
            kaynaklar=kaynaklar,
        )

    return DokumanAnalizCevap(
        yanit=sonuc["yanit"],
        belge_ozeti=ozet,
        kaynaklar=kaynaklar,
        kategori=kategori,
        conversation_id=resolved_conv,
    )


@router.post("/compare")
@limiter.limit("5/minute")
async def dokuman_karsilastir(
    request: Request,
    dosya1: UploadFile = File(...),
    dosya2: UploadFile = File(...),
    soru: str = Form(default="Bu iki belge arasındaki temel farklar ve dikkat etmem gereken maddeler nelerdir?"),
):
    """İki PDF'i karşılaştır ve farklılıkları analiz et."""
    for dosya in (dosya1, dosya2):
        if dosya.content_type not in IZIN_VERILEN_TIPLER and not (dosya.filename or "").endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Sadece PDF dosyaları kabul edilir")

    bayt1 = await dosya1.read()
    bayt2 = await dosya2.read()

    try:
        metin1 = pdf_metin_cikar(bayt1)
        metin2 = pdf_metin_cikar(bayt2)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not metin1.strip():
        raise HTTPException(status_code=400, detail=f"{dosya1.filename}: PDF'den metin çıkarılamadı")
    if not metin2.strip():
        raise HTTPException(status_code=400, detail=f"{dosya2.filename}: PDF'den metin çıkarılamadı")

    # Karşılaştırma sorusu oluştur
    ozet1 = metin1[:1500]
    ozet2 = metin2[:1500]
    kars_soru = (
        f"Aşağıda iki hukuki belge verilmiştir.\n\n"
        f"=== BELGE 1: {dosya1.filename} ===\n{ozet1}\n\n"
        f"=== BELGE 2: {dosya2.filename} ===\n{ozet2}\n\n"
        f"Görev: {soru}\n"
        f"Lütfen madde madde karşılaştırın; önemli fark, eksik ve riskli hükümleri belirtin."
    )

    from rag.pipeline import run_pipeline
    sonuc = run_pipeline(soru=kars_soru, max_kaynak=5)

    return JSONResponse({
        "yanit": sonuc["yanit"],
        "belge1_ozet": metin1[:200].replace("\n", " ").strip() + "...",
        "belge2_ozet": metin2[:200].replace("\n", " ").strip() + "...",
        "kaynaklar": sonuc.get("kaynaklar", []),
        "kategori": sonuc.get("kategori", "Genel Hukuk"),
    })
