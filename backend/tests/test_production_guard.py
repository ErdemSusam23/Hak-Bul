from types import SimpleNamespace

import pytest

import main
import rag.retriever as retriever


def test_assert_upstreams_ready_raises_when_groq_missing_in_strict_mode(monkeypatch):
    monkeypatch.setattr(main.settings, "STRICT_UPSTREAMS", True)
    monkeypatch.setattr(main.settings, "GROQ_API_KEY", "")

    with pytest.raises(RuntimeError, match="Groq API key is not configured"):
        main.assert_upstreams_ready_for_ask()


def test_assert_upstreams_ready_passes_when_strict_mode_disabled(monkeypatch):
    monkeypatch.setattr(main.settings, "STRICT_UPSTREAMS", False)
    monkeypatch.setattr(main.settings, "GROQ_API_KEY", "")
    monkeypatch.setattr(main, "get_qdrant", lambda: SimpleNamespace(get_collection=lambda _: None))

    main.assert_upstreams_ready_for_ask()


def test_assert_upstreams_ready_passes_when_sdk_parse_fails_but_rest_check_succeeds(monkeypatch):
    monkeypatch.setattr(main.settings, "STRICT_UPSTREAMS", True)
    monkeypatch.setattr(main.settings, "GROQ_API_KEY", "gsk_test")
    monkeypatch.setattr(retriever, "is_qdrant_configured", lambda: True)
    monkeypatch.setattr(
        main,
        "get_qdrant",
        lambda: SimpleNamespace(
            get_collection=lambda _: (_ for _ in ()).throw(RuntimeError("parse error"))
        ),
    )

    class _Resp:
        status_code = 200
        text = "{}"

        @staticmethod
        def raise_for_status():
            return None

    monkeypatch.setattr(main.httpx, "get", lambda *args, **kwargs: _Resp())

    main.assert_upstreams_ready_for_ask()


def test_assert_upstreams_ready_raises_when_sdk_and_rest_checks_fail(monkeypatch):
    monkeypatch.setattr(main.settings, "STRICT_UPSTREAMS", True)
    monkeypatch.setattr(main.settings, "GROQ_API_KEY", "gsk_test")
    monkeypatch.setattr(retriever, "is_qdrant_configured", lambda: True)
    monkeypatch.setattr(
        main,
        "get_qdrant",
        lambda: SimpleNamespace(
            get_collection=lambda _: (_ for _ in ()).throw(RuntimeError("parse error"))
        ),
    )
    monkeypatch.setattr(
        main.httpx,
        "get",
        lambda *args, **kwargs: (_ for _ in ()).throw(RuntimeError("network down")),
    )

    with pytest.raises(RuntimeError, match="Qdrant is unreachable"):
        main.assert_upstreams_ready_for_ask()


def test_start_retrieval_warmup_starts_background_thread(monkeypatch):
    monkeypatch.setattr(main.settings, "MOCK_RETRIEVAL", False)

    started = {"value": False}

    class _FakeThread:
        def __init__(self, target, name, daemon):
            self.target = target
            self.name = name
            self.daemon = daemon

        def start(self):
            started["value"] = True

    monkeypatch.setattr(main.threading, "Thread", _FakeThread)

    assert main.start_retrieval_warmup() is True
    assert started["value"] is True


def test_start_retrieval_warmup_skips_in_mock_mode(monkeypatch):
    monkeypatch.setattr(main.settings, "MOCK_RETRIEVAL", True)

    assert main.start_retrieval_warmup() is False
