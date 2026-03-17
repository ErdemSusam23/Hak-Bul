"""PDF yükleme ve hukuki analiz endpoint'leri."""
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

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
async def dokuman_analiz_et(
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
