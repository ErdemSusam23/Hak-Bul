"""
pipeline.py
Main RAG pipeline orchestration.
"""

import re

from config import settings
from rag.categorizer import get_kategorilendirici
from rag.generator import generate_answer
from rag.query_rewriter import rewrite_query
from rag.reranker import rerank_chunks
from rag.retriever import apply_category_penalty, filter_by_score, normalize_relevance_score, retrieve_chunks
from services.language_service import informational_warning

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


def retrieve_context(soru: str, max_kaynak: int = 5) -> dict:
    kategori = get_kategorilendirici().kategorile(soru)
    rewritten = rewrite_query(soru)
    chunks = retrieve_chunks(rewritten, top_n=max_kaynak * 4)
    chunks = apply_category_penalty(chunks, kategori)
    chunks = rerank_chunks(soru, chunks, top_n=max_kaynak * 2)
    filtered = filter_by_score(chunks, threshold=settings.SCORE_THRESHOLD)
    filtered = _deduplicate_sources(filtered)[:max_kaynak]
    kaynaklar = _format_sources(filtered, query=soru)

    return {
        "kategori": kategori,
        "chunks": filtered,
        "kaynaklar": kaynaklar,
    }


def run_pipeline(soru: str, max_kaynak: int = 5, language: str = "tr") -> dict:
    context = retrieve_context(soru, max_kaynak=max_kaynak)
    yanit = generate_answer(soru, context["chunks"], language=language)

    return {
        "yanit": yanit,
        "kaynaklar": context["kaynaklar"],
        "kategori": context["kategori"],
        "uyari": informational_warning(language),
    }


def _format_sources(chunks: list[dict], query: str = "") -> list[dict]:
    if not chunks:
        return []

    sources = []
    for c in chunks:
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

        sources.append(
            {
                "kaynak_turu": kaynak_turu,
                "baslik": baslik,
                "metin_ozet": _build_source_summary(p.get("metin", ""), query=query),
                "skor": normalize_relevance_score(c.get("skor", 0.0)),
                "url": url,
            }
        )

    return sources
