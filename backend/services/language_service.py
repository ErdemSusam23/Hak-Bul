"""Shared language helpers for Turkish and English responses."""

SUPPORTED_LANGUAGES = {"tr", "en"}


def normalize_language(language: str | None) -> str:
    if not language:
        return "tr"

    value = str(language).strip().lower()
    if value.startswith("en"):
        return "en"
    return "tr"


def pick_text(language: str | None, tr_text: str, en_text: str) -> str:
    return en_text if normalize_language(language) == "en" else tr_text


def informational_warning(language: str | None) -> str:
    return pick_text(
        language,
        "Bu yanit bilgi amaclidir ve hukuki tavsiye niteligi tasimaz.",
        "This answer is for informational purposes only and does not constitute legal advice.",
    )


def default_document_question(language: str | None) -> str:
    return pick_text(
        language,
        "Bu belgede dikkat etmem gereken onemli maddeler nelerdir?",
        "What are the important clauses, risks, and points I should pay attention to in this document?",
    )


def default_compare_question(language: str | None) -> str:
    return pick_text(
        language,
        "Bu iki belge arasindaki temel farklar ve dikkat etmem gereken maddeler nelerdir?",
        "What are the main differences between these two documents and which clauses should I pay attention to?",
    )
