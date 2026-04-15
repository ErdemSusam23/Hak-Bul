"""
reranker.py
Cross-encoder reranker for RAG pipeline (Faz 3).

RERANKER_ENABLED=true olduğunda aktif olur; false ise sıfır ek maliyet.
Model lazy-load edilir — ilk kullanımda indirilir ve bellekte tutulur.

Varsayılan model: BAAI/bge-reranker-v2-m3
  - Çok dilli (Türkçe dahil)
  - CPU üzerinde çalışır (~270MB)
  - sentence-transformers CrossEncoder API ile yüklenir

Kullanım (.env veya docker-compose.yml):
    RERANKER_ENABLED=true
    RERANKER_MODEL=BAAI/bge-reranker-v2-m3   # opsiyonel, bu zaten default
"""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

_reranker: Any | None = None


def _get_reranker() -> Any:
    global _reranker
    if _reranker is None:
        from config import settings
        from sentence_transformers import CrossEncoder  # type: ignore[import]

        logger.info("Reranker modeli yükleniyor: %s", settings.RERANKER_MODEL)
        _reranker = CrossEncoder(settings.RERANKER_MODEL, max_length=512)
        logger.info("Reranker hazır.")
    return _reranker


def rerank_chunks(query: str, chunks: list[dict], top_n: int) -> list[dict]:
    """Cross-encoder ile chunk'ları yeniden sırala ve top_n döndür.

    - RERANKER_ENABLED=false ise chunks[:top_n] olduğu gibi döner.
    - Model hatası (indirilemedi, OOM vb.) durumunda orijinal sıra korunur.
    - Reranker skoru chunk'ın "skor" alanının yerini alır; downstream
      filter_by_score ve _format_sources değişmeden çalışmaya devam eder.
    """
    from config import settings

    if not settings.RERANKER_ENABLED or not chunks:
        return chunks[:top_n]

    try:
        reranker = _get_reranker()
        passages = [c.get("payload", {}).get("metin", "") or "" for c in chunks]
        pairs = [(query, p) for p in passages]
        scores: list[float] = reranker.predict(pairs).tolist()

        reranked = sorted(
            zip(chunks, scores),
            key=lambda x: x[1],
            reverse=True,
        )
        result = []
        for chunk, score in reranked[:top_n]:
            result.append({"payload": chunk["payload"], "skor": round(float(score), 4)})
        return result

    except Exception as exc:
        logger.warning(
            "Reranker başarısız, orijinal sıra kullanılıyor: %s", exc, exc_info=True
        )
        return chunks[:top_n]
