"""Embedding mode tests for retriever."""

import pytest

import rag.retriever as retriever
from services import embedding_client


def test_encode_query_uses_remote_embedding_service(monkeypatch):
    monkeypatch.setattr(retriever.settings, "EMBEDDING_MODE", "remote")
    monkeypatch.setattr(
        embedding_client,
        "embed_texts",
        lambda texts: [[0.1, 0.2, 0.3]] if texts else [],
    )

    vector = retriever._encode_query("stopaj nedir")

    assert vector == [0.1, 0.2, 0.3]


def test_retrieve_chunks_falls_back_when_remote_embedding_service_fails(monkeypatch):
    monkeypatch.setattr(retriever.settings, "EMBEDDING_MODE", "remote")
    monkeypatch.setattr(retriever, "is_qdrant_configured", lambda: True)
    monkeypatch.setattr(
        embedding_client,
        "embed_texts",
        lambda _: (_ for _ in ()).throw(embedding_client.EmbeddingServiceError("down")),
    )

    qdrant_called = {"called": False}

    def _qdrant_should_not_be_called(*args, **kwargs):
        qdrant_called["called"] = True
        return []

    monkeypatch.setattr(retriever, "_query_qdrant", _qdrant_should_not_be_called)

    local_fallback = [{"payload": {"chunk_id": "local_1"}, "skor": 0.5}]
    monkeypatch.setattr(
        retriever,
        "_retrieve_local",
        lambda query, top_n, kaynak_turu=None: local_fallback,
    )

    result = retriever.retrieve_chunks("madde 94 stopaj", top_n=5, kaynak_turu="kanun")

    assert result == local_fallback
    assert qdrant_called["called"] is False


def test_retrieve_chunks_raises_when_fallback_disabled_and_remote_embedding_fails(monkeypatch):
    monkeypatch.setattr(retriever.settings, "EMBEDDING_MODE", "remote")
    monkeypatch.setattr(retriever.settings, "ALLOW_LOCAL_RETRIEVAL_FALLBACK", False)
    monkeypatch.setattr(retriever, "is_qdrant_configured", lambda: True)
    monkeypatch.setattr(
        embedding_client,
        "embed_texts",
        lambda _: (_ for _ in ()).throw(embedding_client.EmbeddingServiceError("down")),
    )

    with pytest.raises(RuntimeError, match="Qdrant retrieval failed"):
        retriever.retrieve_chunks("madde 94 stopaj", top_n=5, kaynak_turu="kanun")


def test_retrieve_chunks_raises_when_qdrant_not_configured_and_fallback_disabled(monkeypatch):
    monkeypatch.setattr(retriever.settings, "ALLOW_LOCAL_RETRIEVAL_FALLBACK", False)
    monkeypatch.setattr(retriever, "is_qdrant_configured", lambda: False)

    with pytest.raises(RuntimeError, match="Qdrant is not configured"):
        retriever.retrieve_chunks("madde 94 stopaj", top_n=5, kaynak_turu="kanun")
