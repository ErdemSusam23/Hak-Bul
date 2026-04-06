from types import SimpleNamespace

import pytest

import main


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
