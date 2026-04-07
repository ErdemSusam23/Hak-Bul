"""Retriever fallback behavior tests."""

import pytest

import rag.retriever as retriever


def test_retrieve_chunks_falls_back_to_local_when_embedding_step_fails(monkeypatch):
    monkeypatch.setattr(retriever.settings, "ALLOW_LOCAL_RETRIEVAL_FALLBACK", True)
    monkeypatch.setattr(retriever, "is_qdrant_configured", lambda: True)
    monkeypatch.setattr(
        retriever,
        "_get_model",
        lambda: (_ for _ in ()).throw(RuntimeError("embedding model unavailable")),
    )

    local_fallback = [{"payload": {"chunk_id": "local_1"}, "skor": 0.5}]
    monkeypatch.setattr(
        retriever,
        "_retrieve_local",
        lambda query, top_n, kaynak_turu=None: local_fallback,
    )

    result = retriever.retrieve_chunks("madde 94 stopaj", top_n=5, kaynak_turu="kanun")

    assert result == local_fallback


def test_retrieve_chunks_raises_when_fallback_disabled_and_embedding_step_fails(monkeypatch):
    monkeypatch.setattr(retriever.settings, "ALLOW_LOCAL_RETRIEVAL_FALLBACK", False)
    monkeypatch.setattr(retriever, "is_qdrant_configured", lambda: True)
    monkeypatch.setattr(
        retriever,
        "_get_model",
        lambda: (_ for _ in ()).throw(RuntimeError("embedding model unavailable")),
    )

    with pytest.raises(RuntimeError, match="Qdrant retrieval failed"):
        retriever.retrieve_chunks("madde 94 stopaj", top_n=5, kaynak_turu="kanun")


def test_retrieve_chunks_raises_when_qdrant_not_configured_and_fallback_disabled(monkeypatch):
    monkeypatch.setattr(retriever.settings, "ALLOW_LOCAL_RETRIEVAL_FALLBACK", False)
    monkeypatch.setattr(retriever, "is_qdrant_configured", lambda: False)

    with pytest.raises(RuntimeError, match="Qdrant is not configured"):
        retriever.retrieve_chunks("madde 94 stopaj", top_n=5, kaynak_turu="kanun")


def test_retrieve_chunks_logs_qdrant_error_before_local_fallback(monkeypatch, caplog):
    monkeypatch.setattr(retriever.settings, "ALLOW_LOCAL_RETRIEVAL_FALLBACK", True)
    monkeypatch.setattr(retriever, "is_qdrant_configured", lambda: True)
    monkeypatch.setattr(
        retriever,
        "_get_model",
        lambda: (_ for _ in ()).throw(RuntimeError("embedding model unavailable")),
    )
    local_fallback = [{"payload": {"chunk_id": "local_1"}, "skor": 0.5}]
    monkeypatch.setattr(
        retriever,
        "_retrieve_local",
        lambda query, top_n, kaynak_turu=None: local_fallback,
    )

    with caplog.at_level("WARNING", logger="rag.retriever"):
        result = retriever.retrieve_chunks("madde 94 stopaj", top_n=5, kaynak_turu="kanun")

    assert result == local_fallback
    assert "Qdrant retrieval failed" in caplog.text
