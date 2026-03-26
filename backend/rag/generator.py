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
uretemiyorsan bunu acikca belirt. Hukuki tavsiye verme; bilgi sun.

Eger kullanicinin sorusu su konulardan birini iceriyorsa yanit sonuna bir paragraf olarak
avukat yonlendirmesi ekle (hic uzatma, tek cumle yeter):
- Ceza davasi, tutukluluk, gozalti, yargilama sureci
- Bosanma, velayet, nafaka davasi
- Is mahkemesi, tazminat davasi
- Icra ve iflas hukuku, haciz
- Multeciler, vatandaslik, oturma izni

Yonlendirme formati: "Bu konu profesyonel hukuki destek gerektirmektedir;
baronuzun hukuki yardim burosu veya bir avukat ile gorusmenizi oneririz.
Adalet Bakanligi ALO 182 hattindan ucretsiz hukuki danismanlik alabilirsiniz." """


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


def generate_answer_stream(soru: str, chunks: list[dict]):
    """Groq streaming yanıt üreteci. Her token için str yield eder."""
    if settings.MOCK_MODE or settings.MOCK_LLM or not settings.GROQ_API_KEY:
        # Mock modda fallback yanıtı token token simüle et
        full = _extractive_fallback_answer(chunks)
        for word in full.split(" "):
            yield word + " "
        return

    context = _build_context(chunks)

    try:
        stream = _get_client().chat.completions.create(
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
            stream=True,
        )
        for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta
    except Exception as exc:
        raise RuntimeError(f"Groq streaming hatasi: {exc}") from exc
