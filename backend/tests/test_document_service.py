"""PDF doküman servis testleri."""
import io

import pytest
from pypdf import PdfWriter

from services.document_service import (
    MAX_METIN_KARAKTER,
    MAX_PDF_BOYUT_MB,
    dokuman_analiz_sorusu_hazirla,
    pdf_metin_cikar,
)


def _minimal_pdf_baytlari() -> bytes:
    """Test için boş sayfalı minimal bir PDF üretir."""
    writer = PdfWriter()
    writer.add_blank_page(width=200, height=200)
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


def test_gecersiz_pdf_hata_firlatir():
    """Geçersiz bayt dizisi ValueError fırlatmalı."""
    with pytest.raises(ValueError, match="Geçersiz PDF"):
        pdf_metin_cikar(b"bu pdf degil")


def test_minimal_pdf_str_dondurur():
    """Minimal (boş sayfalı) PDF string döndürmeli."""
    sonuc = pdf_metin_cikar(_minimal_pdf_baytlari())
    assert isinstance(sonuc, str)


def test_boyut_asimi_hata_firlatir():
    """Limit üzerindeki bayt dizisi ValueError fırlatmalı."""
    asiri_buyuk = b"x" * (MAX_PDF_BOYUT_MB * 1024 * 1024 + 1)
    with pytest.raises(ValueError, match="MB'ı aşıyor"):
        pdf_metin_cikar(asiri_buyuk)


def test_uzun_metin_kirpilir():
    """MAX_METIN_KARAKTER üzerindeki metin kırpılıp '[... belge kesildi]' eklenmeli."""
    from unittest.mock import MagicMock, patch

    uzun_metin = "a" * (MAX_METIN_KARAKTER + 500)
    mock_sayfa = MagicMock()
    mock_sayfa.extract_text.return_value = uzun_metin

    mock_okuyucu = MagicMock()
    mock_okuyucu.pages = [mock_sayfa]

    with patch("services.document_service.PdfReader", return_value=mock_okuyucu):
        sonuc = pdf_metin_cikar(_minimal_pdf_baytlari())

    assert len(sonuc) <= MAX_METIN_KARAKTER + len("\n[... belge kesildi]")
    assert sonuc.endswith("[... belge kesildi]")


def test_analiz_sorusu_hazirla():
    """Hazırlanan sorgu hem belgeyi hem soruyu içermeli."""
    sonuc = dokuman_analiz_sorusu_hazirla("belge içeriği", "sorum nedir?")
    assert "belge içeriği" in sonuc
    assert "sorum nedir?" in sonuc
