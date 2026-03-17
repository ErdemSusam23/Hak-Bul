"""PDF doküman işleme servisi."""
import io

from pypdf import PdfReader
from pypdf.errors import PdfReadError

MAX_PDF_BOYUT_MB = 10
MAX_METIN_KARAKTER = 15_000  # LLM context limiti için


def pdf_metin_cikar(pdf_baytlari: bytes) -> str:
    """PDF baytlarından metin çıkarır. Çok büyük PDF'ler kırpılır."""
    if len(pdf_baytlari) > MAX_PDF_BOYUT_MB * 1024 * 1024:
        raise ValueError(f"PDF boyutu {MAX_PDF_BOYUT_MB}MB'ı aşıyor")

    try:
        okuyucu = PdfReader(io.BytesIO(pdf_baytlari))
    except PdfReadError as e:
        raise ValueError(f"Geçersiz PDF dosyası: {e}") from e

    satirlar = []
    for sayfa in okuyucu.pages:
        metin = sayfa.extract_text()
        if metin:
            satirlar.append(metin)

    tam_metin = "\n".join(satirlar)
    if len(tam_metin) > MAX_METIN_KARAKTER:
        tam_metin = tam_metin[:MAX_METIN_KARAKTER] + "\n[... belge kesildi]"

    return tam_metin


def dokuman_analiz_sorusu_hazirla(belge_metni: str, kullanici_sorusu: str) -> str:
    """RAG pipeline'a gönderilecek zenginleştirilmiş sorguyu oluşturur."""
    return (
        f"Aşağıdaki belgeyi analiz et ve soruyu yanıtla:\n\n"
        f"BELGE:\n{belge_metni}\n\n"
        f"SORU: {kullanici_sorusu}"
    )
