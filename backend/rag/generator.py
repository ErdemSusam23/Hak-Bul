"""
generator.py
Generate a Turkish legal answer from retrieved chunks.
"""

from groq import Groq

from config import settings

_client: Groq | None = None


def _get_client() -> Groq:
    global _client
    if _client is None:
        _client = Groq(api_key=settings.GROQ_API_KEY)
    return _client


SYSTEM_PROMPT = """Sen bir Turk hukuku bilgi sistemisin. Sana verilen kanun maddeleri ve
Yargitay kararlarini kaynak alarak kullanicinin sorusunu Turkce yanitla.
Her iddiayi kaynak chunk'a dayandir. Eger verilen kaynaklardan yanit
uretemiyorsan bunu acikca belirt. Hukuki tavsiye verme; bilgi sun."""


def _build_context(chunks: list[dict]) -> str:
    parts = []
    for i, c in enumerate(chunks, start=1):
        p = c["payload"]
        kaynak_turu = p.get("kaynak_turu", "")

        if kaynak_turu == "kanun":
            header = f"[Kaynak {i}] {p.get('kanun_adi', '?')} - {p.get('madde_no', '?')}"
        elif kaynak_turu == "yargitay_karari":
            header = f"[Kaynak {i}] {p.get('daire', 'Yargitay')} - {p.get('karar_no', '?')}"
        else:
            header = f"[Kaynak {i}]"

        parts.append(f"{header}\n{p.get('metin', '')}")

    return "\n\n".join(parts)


def _extractive_fallback_answer(chunks: list[dict]) -> str:
    if not chunks:
        return (
            "Bu soruya ait kaynak bulunamadi. "
            "Lutfen sorunuzu daha acik ve madde numarasiyla birlikte yazin."
        )

    lines = [
        "Groq anahtari olmadigi icin yanit, bulunan kaynaklardan dogrudan ozetlenmistir:"
    ]

    for i, c in enumerate(chunks[:3], start=1):
        p = c["payload"]
        kaynak_turu = p.get("kaynak_turu", "")
        if kaynak_turu == "kanun":
            baslik = f"{p.get('kanun_adi', '?')} - {p.get('madde_no', '?')}"
        else:
            baslik = p.get("chunk_id", "Kaynak")

        metin = (p.get("metin", "") or "").strip().replace("\n", " ")
        if len(metin) > 260:
            metin = metin[:260].rstrip() + "..."
        lines.append(f"{i}. {baslik}: {metin}")

    lines.append(
        "Not: Bu cevap bilgi amaclidir, hukuki tavsiye degildir; kesin degerlendirme icin avukata basvurun."
    )
    return "\n".join(lines)


def generate_answer(soru: str, chunks: list[dict]) -> str:
    if settings.MOCK_MODE or settings.MOCK_LLM or not settings.GROQ_API_KEY:
        return _extractive_fallback_answer(chunks)

    context = _build_context(chunks)

    try:
        response = _get_client().chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": f"Kaynaklar:\n{context}\n\nSoru: {soru}",
                },
            ],
            max_tokens=1000,
            temperature=0.2,
        )
        return response.choices[0].message.content.strip()
    except Exception as exc:
        raise RuntimeError(f"Groq yanit uretme hatasi: {exc}") from exc
