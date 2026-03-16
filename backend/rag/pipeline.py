"""
pipeline.py
Main RAG pipeline orchestration.
"""

from config import settings
from rag.categorizer import get_kategorilendirici
from rag.generator import generate_answer
from rag.query_rewriter import rewrite_query
from rag.retriever import filter_by_score, retrieve_chunks

LAW_MEVZUAT_URLS: dict[str, str] = {
    "4857": "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=4857&MevzuatTur=1&MevzuatTertip=5",
    "5510": "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=5510&MevzuatTur=1&MevzuatTertip=5",
    "6098": "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=6098&MevzuatTur=1&MevzuatTertip=5",
    "1475": "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=1475&MevzuatTur=1&MevzuatTertip=5",
}


def _get_law_url(kanun_adi: str, madde_no: str = "") -> str | None:
    for law_no, url in LAW_MEVZUAT_URLS.items():
        if law_no in kanun_adi:
            return url
    return None


def run_pipeline(soru: str, max_kaynak: int = 5) -> dict:
    kategori = get_kategorilendirici().kategorile(soru)

    rewritten = rewrite_query(soru)

    chunks = retrieve_chunks(rewritten, top_n=max_kaynak)
    filtered = filter_by_score(chunks, threshold=settings.SCORE_THRESHOLD)

    yanit = generate_answer(soru, filtered)
    kaynaklar = _format_sources(filtered[:max_kaynak])

    return {
        "yanit": yanit,
        "kaynaklar": kaynaklar,
        "kategori": kategori,
        "uyari": "Bu yanit bilgi amaclidir ve hukuki tavsiye niteligi tasimaz.",
    }


def _format_sources(chunks: list[dict]) -> list[dict]:
    sources = []
    for c in chunks:
        p = c["payload"]
        kaynak_turu = p.get("kaynak_turu", "")

        if kaynak_turu == "kanun":
            baslik = f"{p.get('kanun_adi', '?')} - {p.get('madde_no', '?')}"
        elif kaynak_turu == "yargitay_karari":
            baslik = f"{p.get('daire', 'Yargitay')} - {p.get('karar_no', '?')}"
        else:
            baslik = p.get("chunk_id", "?")

        url = _get_law_url(p.get("kanun_adi", ""), p.get("madde_no", "")) if kaynak_turu == "kanun" else None

        sources.append(
            {
                "kaynak_turu": kaynak_turu,
                "baslik": baslik,
                "metin_ozet": p.get("metin", "")[:300],
                "skor": round(c["skor"], 4),
                "url": url,
            }
        )

    return sources
