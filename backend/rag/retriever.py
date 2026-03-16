"""
retriever.py
Qdrant retrieval and score filtering utilities.
"""

from __future__ import annotations

import json
import os
import re
import warnings
from pathlib import Path
from typing import Any

from qdrant_client import QdrantClient

from config import settings

warnings.filterwarnings("ignore")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

_qdrant: QdrantClient | None = None
_model: Any | None = None
_local_index: list[dict[str, Any]] | None = None

LOCAL_PROCESSED_FILENAMES = [
    "4857_is_kanunu_chunks.json",
    "5510_sgk_kanunu_chunks.json",
    "6098_turk_borclar_kanunu_chunks.json",
]

TOKEN_RE = re.compile(r"[0-9a-z_]+")
MADDE_RE = re.compile(r"(?:madde|md)\s*\.?\s*(\d+)")
LAW_NUMBERS = ("4857", "5510", "6098")

LAW_HINT_KEYWORDS = {
    "4857": {"isci", "isveren", "kidem", "ihbar", "mesai", "fesih", "ucret", "calisma",
             "izin", "bakim", "mazeret", "hasta", "hastalik", "dogum", "analık", "analik",
             "isten", "ise", "isten_cik", "iscinin", "isveren", "tazminat", "istifa"},
    "5510": {"sgk", "sigorta", "emeklilik", "prim", "borclanma", "is_kazasi", "kazasi", "bildirim", "bildirimi", "malulluk", "analik",
             "istirahat", "rapor", "gecici", "gorezemezlik", "odeme", "saglik"},
    "6098": {"borclar", "kira", "depozito", "temerrut", "sozlesme", "alacak", "satis", "ayip", "faiz", "cezai",
             "kefalet", "hibe", "vekaletname", "dava"},
}

TRANSLATION_TABLE = str.maketrans(
    {
        "ç": "c",
        "Ç": "c",
        "ğ": "g",
        "Ğ": "g",
        "ı": "i",
        "İ": "i",
        "ö": "o",
        "Ö": "o",
        "ş": "s",
        "Ş": "s",
        "ü": "u",
        "Ü": "u",
    }
)

MOCK_CHUNKS = [
    {
        "payload": {
            "kaynak_turu": "kanun",
            "kanun_adi": "4857 Sayili Is Kanunu",
            "madde_no": "Madde 17",
            "metin": (
                "Belirsiz sureli is sozlesmelerinin feshinde bildirim onellerine "
                "uyulmasi zorunludur. Is sozlesmeleri; iscinin kidemine gore "
                "belirli sureler oncesinde bildirimde bulunularak feshedilebilir."
            ),
            "chunk_id": "kanun_4857_m17",
        },
        "skor": 0.91,
    }
]


def _normalize(text: str) -> str:
    return (text or "").translate(TRANSLATION_TABLE).lower()


def _tokenize(text: str) -> list[str]:
    return TOKEN_RE.findall(_normalize(text))


def _processed_dir() -> Path:
    return Path(__file__).resolve().parents[1] / "data" / "processed"


def _iter_local_paths() -> list[Path]:
    base = _processed_dir()
    return [base / name for name in LOCAL_PROCESSED_FILENAMES if (base / name).exists()]


def _extract_law_id(text: str) -> str:
    for law_no in LAW_NUMBERS:
        if law_no in text:
            return law_no
    return ""


def _extract_madde_no(madde_text: str) -> str:
    nums = re.findall(r"\d+", _normalize(madde_text))
    return nums[0] if nums else ""


def _build_local_index() -> list[dict[str, Any]]:
    index: list[dict[str, Any]] = []

    for path in _iter_local_paths():
        try:
            raw = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue

        if not isinstance(raw, list):
            continue

        for item in raw:
            if not isinstance(item, dict):
                continue

            payload = {
                "chunk_id": item.get("chunk_id", ""),
                "kaynak_turu": item.get("kaynak_turu", "kanun"),
                "kanun_adi": item.get("kanun_adi", ""),
                "madde_no": item.get("madde_no", ""),
                "metin": item.get("metin", ""),
                "hukuk_alani": item.get("hukuk_alani", ""),
            }

            searchable = " ".join(
                [
                    str(payload.get("chunk_id", "")),
                    str(payload.get("kanun_adi", "")),
                    str(payload.get("madde_no", "")),
                    str(payload.get("metin", "")),
                    str(payload.get("hukuk_alani", "")),
                ]
            )
            normalized = _normalize(searchable)
            tokens = set(TOKEN_RE.findall(normalized))
            law_id = _extract_law_id(_normalize(payload.get("kanun_adi", "")))
            madde_no = _extract_madde_no(payload.get("madde_no", ""))

            index.append(
                {
                    "payload": payload,
                    "tokens": tokens,
                    "searchable": normalized,
                    "law_id": law_id,
                    "madde_no": madde_no,
                }
            )

    return index


def _get_local_index() -> list[dict[str, Any]]:
    global _local_index
    if _local_index is None:
        _local_index = _build_local_index()
    return _local_index


def has_local_corpus() -> bool:
    return len(_get_local_index()) > 0


def is_qdrant_configured() -> bool:
    return bool(settings.QDRANT_URL)


def _get_qdrant() -> QdrantClient:
    global _qdrant
    if _qdrant is None:
        if not is_qdrant_configured():
            raise RuntimeError("QDRANT_URL is not configured")
        _qdrant = QdrantClient(url=settings.QDRANT_URL, api_key=settings.QDRANT_API_KEY)
    return _qdrant


def _get_model():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer

        _model = SentenceTransformer(settings.EMBEDDING_MODEL)
    return _model


def _query_qdrant(embedding: list[float], top_n: int, kaynak_turu: str | None = None):
    client = _get_qdrant()
    qdrant_filter = None

    if kaynak_turu:
        from qdrant_client.models import FieldCondition, Filter, MatchValue

        qdrant_filter = Filter(
            must=[FieldCondition(key="kaynak_turu", match=MatchValue(value=kaynak_turu))]
        )

    if hasattr(client, "query_points"):
        return client.query_points(
            collection_name=settings.COLLECTION_NAME,
            query=embedding,
            limit=top_n,
            with_payload=True,
            query_filter=qdrant_filter,
        ).points

    return client.search(
        collection_name=settings.COLLECTION_NAME,
        query_vector=embedding,
        limit=top_n,
        with_payload=True,
        query_filter=qdrant_filter,
    )


def _extract_query_laws(query_norm: str) -> set[str]:
    return {law_no for law_no in LAW_NUMBERS if law_no in query_norm}


def _extract_query_madde_numbers(query_norm: str) -> set[str]:
    return set(MADDE_RE.findall(query_norm))


def _semantic_law_hints(query_tokens: set[str]) -> set[str]:
    hinted: set[str] = set()
    def _kw_match(token: str, keyword: str) -> bool:
        if token == keyword:
            return True
        if len(token) >= 4 and len(keyword) >= 4 and token.startswith(keyword[:4]):
            return True
        if len(token) >= 4 and len(keyword) >= 4 and keyword.startswith(token[:4]):
            return True
        return False

    for law_no, keywords in LAW_HINT_KEYWORDS.items():
        if any(_kw_match(token, kw) for token in query_tokens for kw in keywords):
            hinted.add(law_no)
    return hinted


def _score_local_entry(
    entry: dict[str, Any],
    query_norm: str,
    query_tokens: list[str],
    query_laws: set[str],
    query_madde_numbers: set[str],
    hinted_laws: set[str],
) -> float:
    if not query_tokens:
        return 0.0

    token_set = entry["tokens"]
    searchable = entry["searchable"]

    def _token_present(token: str) -> bool:
        if token in token_set:
            return True
        if len(token) >= 5 and token[:5] in searchable:
            return True
        return False

    overlap = sum(1 for token in query_tokens if _token_present(token))
    score = overlap / len(query_tokens)

    if query_norm and query_norm in searchable:
        score += 0.3

    law_id = entry.get("law_id", "")
    if query_laws:
        if law_id in query_laws:
            score += 1.2
        elif law_id:
            score -= 0.8
    elif hinted_laws:
        if law_id in hinted_laws:
            score += 0.9
        elif law_id:
            score -= 0.35

    madde_no = entry.get("madde_no", "")
    if query_madde_numbers:
        if madde_no and madde_no in query_madde_numbers:
            score += 1.0
        elif query_laws and law_id in query_laws:
            score -= 0.4

    return score


def _retrieve_local(query: str, top_n: int = 5, kaynak_turu: str | None = None) -> list[dict]:
    index = _get_local_index()
    if not index:
        return []

    query_norm = _normalize(query)
    query_tokens = [t for t in TOKEN_RE.findall(query_norm) if len(t) > 2]
    query_laws = _extract_query_laws(query_norm)
    query_madde_numbers = _extract_query_madde_numbers(query_norm)
    hinted_laws = _semantic_law_hints(set(query_tokens))

    scored: list[dict] = []
    for entry in index:
        payload = entry["payload"]
        if kaynak_turu and payload.get("kaynak_turu") != kaynak_turu:
            continue

        score = _score_local_entry(
            entry=entry,
            query_norm=query_norm,
            query_tokens=query_tokens,
            query_laws=query_laws,
            query_madde_numbers=query_madde_numbers,
            hinted_laws=hinted_laws,
        )

        if score > 0:
            scored.append({"payload": payload, "skor": round(score, 4)})

    if not scored:
        fallback_entries = index
        if query_laws:
            fallback_entries = [e for e in index if e.get("law_id") in query_laws] or index

        for entry in fallback_entries:
            payload = entry["payload"]
            if kaynak_turu and payload.get("kaynak_turu") != kaynak_turu:
                continue
            scored.append({"payload": payload, "skor": 0.01})
            if len(scored) >= top_n:
                break

    scored.sort(key=lambda x: x["skor"], reverse=True)
    return scored[:top_n]


def retrieve_chunks(query: str, top_n: int = 5, kaynak_turu: str | None = None) -> list[dict]:
    if settings.MOCK_RETRIEVAL:
        if not kaynak_turu:
            return MOCK_CHUNKS
        return [c for c in MOCK_CHUNKS if c["payload"].get("kaynak_turu") == kaynak_turu]

    if not is_qdrant_configured():
        return _retrieve_local(query=query, top_n=top_n, kaynak_turu=kaynak_turu)

    # Hybrid retrieval: local index for kanun, Qdrant for yargitay_karari
    combined: list[dict] = []

    # Always pull kanun articles from the local index
    if not kaynak_turu or kaynak_turu == "kanun":
        local_kanun = _retrieve_local(query=query, top_n=top_n, kaynak_turu="kanun")
        # Normalize local scores to [0, 1] to be comparable with Qdrant cosine similarity
        for chunk in local_kanun:
            chunk["skor"] = round(min(chunk["skor"] / 2.0, 0.99), 4)
        combined.extend(local_kanun)

    # Pull yargitay_karari from Qdrant (semantic search works well for case law)
    if not kaynak_turu or kaynak_turu == "yargitay_karari":
        try:
            model = _get_model()
            embedding = model.encode(f"query: {query}").tolist()
            qdrant_results = _query_qdrant(
                embedding=embedding,
                top_n=top_n,
                kaynak_turu="yargitay_karari" if not kaynak_turu else kaynak_turu,
            )
            combined.extend([{"payload": r.payload, "skor": r.score} for r in qdrant_results])
        except Exception:
            if not combined:
                return _retrieve_local(query=query, top_n=top_n, kaynak_turu=kaynak_turu)

    combined.sort(key=lambda x: x["skor"], reverse=True)
    return combined[:top_n]


def filter_by_score(chunks: list[dict], threshold: float | None = None) -> list[dict]:
    if not chunks:
        return []

    if threshold is None:
        threshold = settings.SCORE_THRESHOLD

    filtered = [c for c in chunks if c["skor"] >= threshold]
    if filtered:
        return filtered

    sorted_chunks = sorted(chunks, key=lambda c: c["skor"], reverse=True)
    return sorted_chunks[: min(3, len(sorted_chunks))]
