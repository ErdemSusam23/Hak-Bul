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
        lambda soru, max_kaynak=5: {
            "kategori": "Genel Hukuk",
            "chunks": [],
            "kaynaklar": [],
        },
    )

    def fake_generate_answer(soru, chunks, language="tr"):
        captured["language"] = language
        return "ok"

    monkeypatch.setattr(pipeline, "generate_answer", fake_generate_answer)

    result = pipeline.run_pipeline("What does this article mean?", language="en")

    assert captured["language"] == "en"
    assert result["uyari"].startswith("This answer")
