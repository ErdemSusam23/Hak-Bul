import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from rag import pipeline
from services.language_service import (
    default_compare_question,
    default_document_question,
    informational_warning,
    normalize_language,
)


def test_language_helpers_support_turkish_and_english():
    assert normalize_language(None) == "tr"
    assert normalize_language("EN-us") == "en"
    assert "important clauses" in default_document_question("en")
    assert "main differences" in default_compare_question("en")
    assert informational_warning("en").startswith("This answer")


def test_run_pipeline_passes_language_to_generator(monkeypatch):
    captured = {}

    monkeypatch.setattr(
        pipeline,
        "retrieve_context",
        lambda soru, max_kaynak=5, request_id=None: {
            "kategori": "Genel Hukuk",
            "chunks": [],
            "kaynaklar": [],
        },
    )

    def fake_generate_answer(soru, chunks, language="tr", request_id=None):
        captured["language"] = language
        return "ok"

    monkeypatch.setattr(pipeline, "generate_answer", fake_generate_answer)

    result = pipeline.run_pipeline("What does this article mean?", language="en")

    assert captured["language"] == "en"
    assert result["uyari"].startswith("This answer")


def test_retrieve_context_skips_rerank_when_top_score_is_confident(monkeypatch):
    monkeypatch.setattr(pipeline.settings, "RERANKER_ENABLED", True)
    monkeypatch.setattr(pipeline.settings, "RERANKER_ALWAYS_ON", False)
    monkeypatch.setattr(
        pipeline,
        "get_kategorilendirici",
        lambda: type("K", (), {"kategorile": lambda self, soru: "Genel Hukuk"})(),
    )
    monkeypatch.setattr(pipeline, "rewrite_query", lambda soru, request_id=None: soru)
    monkeypatch.setattr(
        pipeline,
        "retrieve_chunks",
        lambda query, top_n=5, request_id=None: [
            {"payload": {"chunk_id": "a", "metin": "A"}, "skor": 0.91},
            {"payload": {"chunk_id": "b", "metin": "B"}, "skor": 0.74},
            {"payload": {"chunk_id": "c", "metin": "C"}, "skor": 0.69},
        ],
    )
    monkeypatch.setattr(pipeline, "apply_category_penalty", lambda chunks, kategori: chunks)

    called = {"rerank": False}

    def fake_rerank(*args, **kwargs):
        called["rerank"] = True
        return []

    monkeypatch.setattr(pipeline, "rerank_chunks", fake_rerank)
    monkeypatch.setattr(pipeline, "filter_by_score", lambda chunks, threshold=None: chunks)
    monkeypatch.setattr(pipeline, "_format_sources", lambda chunks, query="": [])

    result = pipeline.retrieve_context("test soru", max_kaynak=5)

    assert called["rerank"] is False
    assert result["chunks"][0]["payload"]["chunk_id"] == "a"


def test_retrieve_context_always_reranks_when_always_on(monkeypatch):
    monkeypatch.setattr(pipeline.settings, "RERANKER_ENABLED", True)
    monkeypatch.setattr(pipeline.settings, "RERANKER_ALWAYS_ON", True)
    monkeypatch.setattr(
        pipeline,
        "get_kategorilendirici",
        lambda: type("K", (), {"kategorile": lambda self, soru: "Genel Hukuk"})(),
    )
    monkeypatch.setattr(pipeline, "rewrite_query", lambda soru, request_id=None: soru)
    monkeypatch.setattr(
        pipeline,
        "retrieve_chunks",
        lambda query, top_n=5, request_id=None: [
            {"payload": {"chunk_id": "a", "metin": "A"}, "skor": 0.91},
            {"payload": {"chunk_id": "b", "metin": "B"}, "skor": 0.74},
        ],
    )
    monkeypatch.setattr(pipeline, "apply_category_penalty", lambda chunks, kategori: chunks)

    called = {"rerank": False}

    def fake_rerank(query, chunks, top_n):
        called["rerank"] = True
        return chunks[:top_n]

    monkeypatch.setattr(pipeline, "rerank_chunks", fake_rerank)
    monkeypatch.setattr(pipeline, "filter_by_score", lambda chunks, threshold=None: chunks)
    monkeypatch.setattr(pipeline, "_format_sources", lambda chunks, query="": [])

    result = pipeline.retrieve_context("test soru", max_kaynak=5)

    assert called["rerank"] is True
    assert result["chunks"][0]["payload"]["chunk_id"] == "a"


def test_retrieve_context_reranks_when_top_score_is_weak(monkeypatch):
    monkeypatch.setattr(pipeline.settings, "RERANKER_ENABLED", True)
    monkeypatch.setattr(pipeline.settings, "RERANKER_ALWAYS_ON", False)
    monkeypatch.setattr(
        pipeline,
        "get_kategorilendirici",
        lambda: type("K", (), {"kategorile": lambda self, soru: "Genel Hukuk"})(),
    )
    monkeypatch.setattr(pipeline, "rewrite_query", lambda soru, request_id=None: soru)
    monkeypatch.setattr(
        pipeline,
        "retrieve_chunks",
        lambda query, top_n=5, request_id=None: [
            {"payload": {"chunk_id": "a", "metin": "A"}, "skor": 0.41},
            {"payload": {"chunk_id": "b", "metin": "B"}, "skor": 0.39},
            {"payload": {"chunk_id": "c", "metin": "C"}, "skor": 0.35},
        ],
    )
    monkeypatch.setattr(pipeline, "apply_category_penalty", lambda chunks, kategori: chunks)

    called = {"rerank": False, "received": None}

    def fake_rerank(query, chunks, top_n):
        called["rerank"] = True
        called["received"] = [chunk["payload"]["chunk_id"] for chunk in chunks]
        return [{"payload": {"chunk_id": "b", "metin": "B"}, "skor": 0.99}]

    monkeypatch.setattr(pipeline, "rerank_chunks", fake_rerank)
    monkeypatch.setattr(pipeline, "filter_by_score", lambda chunks, threshold=None: chunks)
    monkeypatch.setattr(pipeline, "_format_sources", lambda chunks, query="": [])

    result = pipeline.retrieve_context("test soru", max_kaynak=5)

    assert called["rerank"] is True
    assert called["received"] == ["a", "b", "c"]
    assert result["chunks"][0]["payload"]["chunk_id"] == "b"
