"""
pipeline.py
Main RAG pipeline orchestration.
"""

import logging
import re
from time import perf_counter

from config import settings
from rag.categorizer import get_kategorilendirici
from rag.generator import generate_answer
from rag.query_rewriter import rewrite_query
from rag.reranker import rerank_chunks
from rag.retriever import apply_category_penalty, filter_by_score, normalize_relevance_score, retrieve_chunks
from services.language_service import informational_warning

logger = logging.getLogger(__name__)
perf_logger = logging.getLogger("uvicorn.error")

DEFAULT_RERANK_CANDIDATE_FLOOR = 8

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

SUMMARY_TOKEN_RE = re.compile(r"[0-9A-Za-zÇĞİÖŞÜçğıöşü]+")
SUMMARY_SPLIT_RE = re.compile(r"(?<=[.!?;:])\s+|\n+")
SUMMARY_STOPWORDS = {
    "acaba",
    "ama",
    "ancak",
    "bir",
    "bu",
    "da",
    "de",
    "gibi",
    "hangi",
    "için",
    "icin",
    "ile",
    "mi",
    "mu",
    "mü",
    "mu?",
    "mı",
    "mi?",
    "mıdır",
    "na",
    "nasıl",
    "nasil",
    "nedir",
    "ne",
    "ve",
    "veya",
}


def _get_law_url(kanun_adi: str, madde_no: str = "") -> str | None:
    for law_no, url in LAW_MEVZUAT_URLS.items():
        if law_no in kanun_adi:
            return url
    return None


def _normalize_summary_text(text: str) -> str:
    cleaned = re.sub(r"\s+", " ", (text or "")).strip()
    return cleaned


def _truncate_summary(text: str, max_chars: int = 280) -> str:
    text = _normalize_summary_text(text)
    if len(text) <= max_chars:
        return text

    truncated = text[: max_chars + 1].rsplit(" ", 1)[0].strip()
    return f"{truncated}..." if truncated else f"{text[:max_chars].strip()}..."


def _tokenize_summary_query(query: str) -> list[str]:
    tokens = [token.lower() for token in SUMMARY_TOKEN_RE.findall(query or "")]
    return [token for token in tokens if len(token) > 2 and token not in SUMMARY_STOPWORDS]


def _build_source_summary(text: str, query: str, max_chars: int = 280) -> str:
    cleaned = _normalize_summary_text(text)
    if not cleaned:
        return ""

    query_tokens = _tokenize_summary_query(query)
    sentences = [
        sentence.strip()
        for sentence in SUMMARY_SPLIT_RE.split(cleaned)
        if len(sentence.strip()) >= 25
    ]
    if not sentences:
        return _truncate_summary(cleaned, max_chars=max_chars)

    wants_duration = any(token in {"süre", "sure", "zaman", "kaç", "kac"} for token in query_tokens)
    scored: list[tuple[int, float, str]] = []
    for index, sentence in enumerate(sentences):
        sentence_lower = sentence.lower()
        overlap = sum(1 for token in query_tokens if token in sentence_lower)
        score = float(overlap)

        if wants_duration and re.search(r"\b\d+\b", sentence_lower):
            score += 1.25
        if wants_duration and any(unit in sentence_lower for unit in ("iş günü", "gün", "ay", "yıl", "saat")):
            score += 0.75
        if "başvuru" in sentence_lower and any(token.startswith("başvur") or token.startswith("basvur") for token in query_tokens):
            score += 0.75

        scored.append((index, score, sentence))

    relevant = [item for item in scored if item[1] > 0]
    if not relevant:
        return _truncate_summary(sentences[0], max_chars=max_chars)

    selected = sorted(relevant, key=lambda item: (-item[1], item[0]))[:3]
    selected.sort(key=lambda item: item[0])

    parts: list[str] = []
    total = 0
    for _, _, sentence in selected:
        addition = sentence if not parts else f" {sentence}"
        if total + len(addition) > max_chars and parts:
            break
        parts.append(sentence)
        total += len(addition)

    summary = " ".join(parts) if parts else selected[0][2]
    return _truncate_summary(summary, max_chars=max_chars)


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


def _score_of(chunk: dict) -> float:
    try:
        return float(chunk.get("skor", 0.0))
    except (TypeError, ValueError):
        return 0.0


def _should_rerank(chunks: list[dict]) -> bool:
    if not settings.RERANKER_ENABLED or not chunks:
        return False
    return _score_of(chunks[0]) < settings.SCORE_THRESHOLD


def _select_rerank_candidates(chunks: list[dict], max_kaynak: int) -> list[dict]:
    candidate_limit = min(len(chunks), max(DEFAULT_RERANK_CANDIDATE_FLOOR, max_kaynak + 3))
    return chunks[:candidate_limit]


def retrieve_context(soru: str, max_kaynak: int = 5, request_id: str | None = None) -> dict:
    total_started_at = perf_counter()

    stage_started_at = perf_counter()
    kategori = get_kategorilendirici().kategorile(soru)
    kategori_ms = (perf_counter() - stage_started_at) * 1000

    stage_started_at = perf_counter()
    rewritten = rewrite_query(soru, request_id=request_id)
    rewrite_ms = (perf_counter() - stage_started_at) * 1000

    stage_started_at = perf_counter()
    chunks = retrieve_chunks(rewritten, top_n=max_kaynak * 4, request_id=request_id)
    retrieve_ms = (perf_counter() - stage_started_at) * 1000

    stage_started_at = perf_counter()
    chunks = apply_category_penalty(chunks, kategori)
    category_penalty_ms = (perf_counter() - stage_started_at) * 1000

    stage_started_at = perf_counter()
    rerank_applied = False
    rerank_candidate_count = 0
    rerank_top_score_before = _score_of(chunks[0]) if chunks else 0.0
    if _should_rerank(chunks):
        rerank_candidates = _select_rerank_candidates(chunks, max_kaynak=max_kaynak)
        rerank_candidate_count = len(rerank_candidates)
        chunks = rerank_chunks(
            soru,
            rerank_candidates,
            top_n=min(len(rerank_candidates), max_kaynak * 2),
        )
        rerank_applied = True
    rerank_ms = (perf_counter() - stage_started_at) * 1000

    stage_started_at = perf_counter()
    filtered = filter_by_score(chunks, threshold=settings.SCORE_THRESHOLD)
    filter_ms = (perf_counter() - stage_started_at) * 1000

    stage_started_at = perf_counter()
    filtered = _deduplicate_sources(filtered)[:max_kaynak]
    kaynaklar = _format_sources(filtered, query=soru)
    format_ms = (perf_counter() - stage_started_at) * 1000

    if settings.PERF_LOG_ENABLED:
        perf_logger.info(
            "[perf][%s] retrieve_context total_ms=%.1f categorize_ms=%.1f rewrite_ms=%.1f retrieve_ms=%.1f category_penalty_ms=%.1f rerank_ms=%.1f rerank_applied=%s rerank_candidates=%s rerank_top_score_before=%.3f filter_ms=%.1f format_ms=%.1f chunks=%s filtered=%s sources=%s",
            request_id or "-",
            (perf_counter() - total_started_at) * 1000,
            kategori_ms,
            rewrite_ms,
            retrieve_ms,
            category_penalty_ms,
            rerank_ms,
            rerank_applied,
            rerank_candidate_count,
            rerank_top_score_before,
            filter_ms,
            format_ms,
            len(chunks),
            len(filtered),
            len(kaynaklar),
        )

    return {
        "kategori": kategori,
        "chunks": filtered,
        "kaynaklar": kaynaklar,
    }


def run_pipeline(soru: str, max_kaynak: int = 5, language: str = "tr", request_id: str | None = None) -> dict:
    total_started_at = perf_counter()

    stage_started_at = perf_counter()
    context = retrieve_context(soru, max_kaynak=max_kaynak, request_id=request_id)
    context_ms = (perf_counter() - stage_started_at) * 1000

    stage_started_at = perf_counter()
    yanit = generate_answer(soru, context["chunks"], language=language, request_id=request_id)
    answer_ms = (perf_counter() - stage_started_at) * 1000

    if settings.PERF_LOG_ENABLED:
        perf_logger.info(
            "[perf][%s] run_pipeline total_ms=%.1f context_ms=%.1f answer_ms=%.1f",
            request_id or "-",
            (perf_counter() - total_started_at) * 1000,
            context_ms,
            answer_ms,
        )

    return {
        "yanit": yanit,
        "kaynaklar": context["kaynaklar"],
        "kategori": context["kategori"],
        "uyari": informational_warning(language),
    }


def _format_sources(chunks: list[dict], query: str = "") -> list[dict]:
    if not chunks:
        return []

    raw_scores = []
    for chunk in chunks:
        try:
            raw_scores.append(float(chunk.get("skor", 0.0)))
        except (TypeError, ValueError):
            raw_scores.append(0.0)

    batch_max_score = max(raw_scores, default=0.0)
    should_rescale = batch_max_score > 1.0

    sources = []
    for c, raw_score in zip(chunks, raw_scores):
        p = c["payload"]
        kaynak_turu = p.get("kaynak_turu", "")
        fikra_no = p.get("fikra_no")

        if kaynak_turu == "kanun":
            baslik = f"{p.get('kanun_adi', '?')} - {p.get('madde_no', '?')}"
            if fikra_no:
                baslik = f"{baslik} - {fikra_no}"
        elif kaynak_turu == "yargitay_karari":
            baslik = f"{p.get('daire', 'Yargitay')} - {p.get('karar_no', '?')}"
        else:
            baslik = p.get("chunk_id", "?")

        url = _get_law_url(p.get("kanun_adi", ""), p.get("madde_no", "")) if kaynak_turu == "kanun" else None
        normalized_score = raw_score / batch_max_score if should_rescale and batch_max_score > 0 else raw_score

        sources.append(
            {
                "kaynak_turu": kaynak_turu,
                "baslik": baslik,
                "metin_ozet": _build_source_summary(p.get("metin", ""), query=query),
                "skor": normalize_relevance_score(normalized_score),
                "url": url,
            }
        )

    return sources
