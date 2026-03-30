"""
query_rewriter.py
User query rewriting for better retrieval quality.
"""

import re

from groq import Groq

from config import settings

_client: Groq | None = None


def _get_client() -> Groq:
    global _client
    if _client is None:
        _client = Groq(api_key=settings.GROQ_API_KEY)
    return _client


SYSTEM_PROMPT = """Sen bir Türk hukuku uzmanısın. Kullanıcının sorusunu,
vektör arama için optimize edilmiş kısa bir arama sorgusuna dönüştür.
Kurallar:
- Yalnızca 1 kısa cümle yaz (maksimum 15 kelime)
- Türkçe karakterleri KORU (ç, ğ, ı, ö, ş, ü harflerini değiştirme)
- Hukuki kavramları aç (örneğin 'hasta bakım izni', 'kıdem tazminatı', 'kira sözleşmesi')
- KESİNLİKLE kanun numarası, madde numarası veya açıklama EKLEME
- Sadece arama sorgusunu yaz, başka hiçbir şey yazma"""

EXPLICIT_REFERENCE_RE = re.compile(
    r"(?i)\b(?:madde|md|gecici\s+madde|ek\s+madde|mukerrer\s+madde)\b|\b\d{3,4}\b"
)


def _has_explicit_legal_reference(soru: str) -> bool:
    return bool(EXPLICIT_REFERENCE_RE.search(soru or ""))


def rewrite_query(soru: str) -> str:
    if _has_explicit_legal_reference(soru):
        return soru

    if settings.MOCK_MODE or settings.MOCK_LLM or not settings.GROQ_API_KEY:
        return soru

    try:
        response = _get_client().chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": soru},
            ],
            max_tokens=60,
            temperature=0.0,
        )
        rewritten = response.choices[0].message.content.strip()
        # Sanity check: if rewritten is much longer than original or looks repetitive, use original
        if len(rewritten) > len(soru) * 2 or rewritten.count(rewritten[:20]) > 2:
            return soru
        return rewritten
    except Exception:
        # If Groq is temporarily unavailable, continue with original query.
        return soru
