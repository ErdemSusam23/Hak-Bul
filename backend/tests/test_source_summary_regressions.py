import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from rag.pipeline import _format_sources


def test_format_sources_builds_query_aware_summary_without_full_text():
    chunks = [
        {
            "payload": {
                "chunk_id": "kanun_4982_madde6",
                "kaynak_turu": "kanun",
                "kanun_adi": "4982 Sayılı Bilgi Edinme Hakkı Kanunu",
                "madde_no": "Madde 6",
                "metin": (
                    "Bilgi edinme hakkı, Anayasa'nın 74. maddesinde düzenlenen temel bir haktır. "
                    "Bu genel ilke kamu kurumlarının şeffaflık yükümlülüğünü destekler. "
                    "Kamu yönetiminde açıklık ve hesap verebilirlik esastır. "
                    "Bilgi edinme başvurusu, yazılı olarak veya elektronik ortamda yapılabilir. "
                    "Başvuru dilekçesinde talep edilen bilgi veya belgenin konusu açıkça belirtilmelidir. "
                    "Kamu kurumu veya kuruluşu başvuru sahibine 15 iş günü içinde cevap verir."
                ),
            },
            "skor": 0.91,
        }
    ]

    kaynaklar = _format_sources(chunks, query="Bilgi edinme başvurusu nasıl yapılır ve süre nedir?")

    assert len(kaynaklar) == 1
    assert "metin" not in kaynaklar[0]
    assert "yazılı olarak veya elektronik ortamda yapılabilir" in kaynaklar[0]["metin_ozet"]
    assert "15 iş günü içinde cevap verir" in kaynaklar[0]["metin_ozet"]
