"""
query_rewriter.py
User query rewriting for better retrieval quality.
"""

from groq import Groq

from config import settings

_client: Groq | None = None


def _get_client() -> Groq:
    global _client
    if _client is None:
        _client = Groq(api_key=settings.GROQ_API_KEY)
    return _client


SYSTEM_PROMPT = """Sen bir Turk is hukuku uzmansin. Kullanicinin sorusunu,
vektor arama icin optimize edilmis kisa bir arama sorgusuna donustur.
Kurallar:
- Maksimum 1-2 cumle yaz
- Turkce karakterleri duzelt
- Ilgili kanun veya Yargitay terimlerini ekle
- Sadece sorguyu yaz, aciklama yapma"""


def rewrite_query(soru: str) -> str:
    if settings.MOCK_MODE or settings.MOCK_LLM or not settings.GROQ_API_KEY:
        return soru

    try:
        response = _get_client().chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": soru},
            ],
            max_tokens=80,
            temperature=0.0,
        )
        return response.choices[0].message.content.strip()
    except Exception:
        # If Groq is temporarily unavailable, continue with original query.
        return soru
