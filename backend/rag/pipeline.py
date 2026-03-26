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
    "193":  "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=193&MevzuatTur=1&MevzuatTertip=5",
    "657":  "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=657&MevzuatTur=1&MevzuatTertip=5",
    "1475": "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=1475&MevzuatTur=1&MevzuatTertip=5",
    "2004": "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=2004&MevzuatTur=1&MevzuatTertip=5",
    "2577": "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=2577&MevzuatTur=1&MevzuatTertip=5",
    "2709": "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=2709&MevzuatTur=1&MevzuatTertip=5",
    "2918": "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=2918&MevzuatTur=1&MevzuatTertip=5",
    "2942": "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=2942&MevzuatTur=1&MevzuatTertip=5",
    "3065": "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=3065&MevzuatTur=1&MevzuatTertip=5",
    "3071": "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=3071&MevzuatTur=1&MevzuatTertip=5",
    "3194": "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=3194&MevzuatTur=1&MevzuatTertip=5",
    "4447": "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=4447&MevzuatTur=1&MevzuatTertip=5",
    "4721": "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=4721&MevzuatTur=1&MevzuatTertip=5",
    "4734": "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=4734&MevzuatTur=1&MevzuatTertip=5",
    "4857": "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=4857&MevzuatTur=1&MevzuatTertip=5",
    "4904": "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=4904&MevzuatTur=1&MevzuatTertip=5",
    "4982": "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=4982&MevzuatTur=1&MevzuatTertip=5",
    "5070": "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=5070&MevzuatTur=1&MevzuatTertip=5",
    "5237": "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=5237&MevzuatTur=1&MevzuatTertip=5",
    "5253": "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=5253&MevzuatTur=1&MevzuatTertip=5",
    "5411": "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=5411&MevzuatTur=1&MevzuatTertip=5",
    "5510": "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=5510&MevzuatTur=1&MevzuatTertip=5",
    "5520": "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=5520&MevzuatTur=1&MevzuatTertip=5",
    "5651": "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=5651&MevzuatTur=1&MevzuatTertip=5",
    "5846": "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=5846&MevzuatTur=1&MevzuatTertip=5",
    "6098": "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=6098&MevzuatTur=1&MevzuatTertip=5",
    "6100": "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=6100&MevzuatTur=1&MevzuatTertip=5",
    "6102": "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=6102&MevzuatTur=1&MevzuatTertip=5",
    "6284": "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=6284&MevzuatTur=1&MevzuatTertip=5",
    "6306": "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=6306&MevzuatTur=1&MevzuatTertip=5",
    "6331": "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=6331&MevzuatTur=1&MevzuatTertip=5",
    "6356": "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=6356&MevzuatTur=1&MevzuatTertip=5",
    "6362": "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=6362&MevzuatTur=1&MevzuatTertip=5",
    "6502": "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=6502&MevzuatTur=1&MevzuatTertip=5",
    "6698": "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=6698&MevzuatTur=1&MevzuatTertip=5",
    "7036": "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=7036&MevzuatTur=1&MevzuatTertip=5",
    "7201": "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=7201&MevzuatTur=1&MevzuatTertip=5",
    "2911": "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=2911&MevzuatTur=1&MevzuatTertip=5",
}


def _get_law_url(kanun_adi: str, madde_no: str = "") -> str | None:
    for law_no, url in LAW_MEVZUAT_URLS.items():
        if law_no in kanun_adi:
            return url
    return None


def _deduplicate_sources(chunks: list[dict]) -> list[dict]:
    """Deduplicate formatted source chunks by title to avoid showing identical sources."""
    seen: set[str] = set()
    unique: list[dict] = []
    for c in chunks:
        p = c["payload"]
        kaynak_turu = p.get("kaynak_turu", "")
        if kaynak_turu == "yargitay_karari":
            key = f"{p.get('daire', '')}|{p.get('karar_no', '')}"
        else:
            key = p.get("chunk_id", "") or f"{p.get('kanun_adi', '')}|{p.get('madde_no', '')}"
        if key not in seen:
            seen.add(key)
            unique.append(c)
    return unique


def run_pipeline(soru: str, max_kaynak: int = 5) -> dict:
    kategori = get_kategorilendirici().kategorile(soru)

    rewritten = rewrite_query(soru)

    chunks = retrieve_chunks(rewritten, top_n=max_kaynak * 2)
    filtered = filter_by_score(chunks, threshold=settings.SCORE_THRESHOLD)
    filtered = _deduplicate_sources(filtered)[:max_kaynak]

    yanit = generate_answer(soru, filtered)
    kaynaklar = _format_sources(filtered)

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
