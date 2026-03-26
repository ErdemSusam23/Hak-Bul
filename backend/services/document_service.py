"""PDF document processing helpers."""

import io

from pypdf import PdfReader
from pypdf.errors import PdfReadError

MAX_PDF_BOYUT_MB = 10
MAX_METIN_KARAKTER = 15_000


def pdf_metin_cikar(pdf_baytlari: bytes) -> str:
    """Extract text from PDF bytes and cap oversized documents."""
    if len(pdf_baytlari) > MAX_PDF_BOYUT_MB * 1024 * 1024:
        raise ValueError(f"PDF boyutu {MAX_PDF_BOYUT_MB}MB'ı aşıyor")

    try:
        okuyucu = PdfReader(io.BytesIO(pdf_baytlari))
    except PdfReadError as exc:
        raise ValueError(f"Geçersiz PDF dosyası: {exc}") from exc

    satirlar: list[str] = []
    for sayfa in okuyucu.pages:
        metin = sayfa.extract_text()
        if metin:
            satirlar.append(metin)

    tam_metin = "\n".join(satirlar).strip()
    if len(tam_metin) > MAX_METIN_KARAKTER:
        tam_metin = tam_metin[:MAX_METIN_KARAKTER].rstrip() + "\n[... belge kesildi]"

    return tam_metin


def compact_document_text(metin: str, max_chars: int) -> str:
    metin = (metin or "").strip()
    if len(metin) <= max_chars:
        return metin

    head = max_chars // 2
    tail = max_chars - head
    return f"{metin[:head].rstrip()}\n[... belge kisaltildi ...]\n{metin[-tail:].lstrip()}"


def document_preview(metin: str, max_chars: int = 300) -> str:
    temiz = " ".join((metin or "").split())
    if len(temiz) <= max_chars:
        return temiz
    return temiz[:max_chars].rstrip() + "..."


def dokuman_analiz_sorusu_hazirla(belge_metni: str, soru: str) -> str:
    """Prepare a prompt-like analysis query that includes both document and question."""
    temiz_belge = (belge_metni or "").strip()
    temiz_soru = (soru or "").strip()
    return f"Belge içeriği:\n{temiz_belge}\n\nSoru:\n{temiz_soru}"
