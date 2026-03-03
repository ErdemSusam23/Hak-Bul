"""
pipeline.py
Main RAG pipeline orchestration.
"""

from config import settings
from rag.generator import generate_answer
from rag.query_rewriter import rewrite_query
from rag.retriever import filter_by_score, retrieve_chunks


def run_pipeline(soru: str, max_kaynak: int = 5) -> dict:
    rewritten = rewrite_query(soru)

    chunks = retrieve_chunks(rewritten, top_n=max_kaynak)
    filtered = filter_by_score(chunks, threshold=settings.SCORE_THRESHOLD)

    yanit = generate_answer(soru, filtered)
    kaynaklar = _format_sources(filtered[:max_kaynak])

    return {
        "yanit": yanit,
        "kaynaklar": kaynaklar,
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

        sources.append(
            {
                "kaynak_turu": kaynak_turu,
                "baslik": baslik,
                "metin_ozet": p.get("metin", "")[:300],
                "skor": round(c["skor"], 4),
            }
        )

    return sources
