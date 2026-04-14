"""
generator.py
Answer generation helpers for chat and document workflows.
"""

from groq import Groq

from config import settings
from services.language_service import informational_warning, normalize_language, pick_text

_client: Groq | None = None

GENERAL_SYSTEM_PROMPT_TR = """Sen bir Turk hukuku bilgi sistemisin. Sana verilen kanun
maddeleri ve Yargitay kararlarini kaynak alarak kullanicinin sorusunu Turkce
yanitla. Her iddiayi verilen kaynaklara dayandir. Kaynakta gecmeyen madde numarasi,
tarih veya hukum KESINLIKLE ekleme. Getirilen kaynaklar soruyu yanitlamaya
yetmiyorsa bunu acikca belirt; kendi genel bilginle bosluk doldurma.
Hukuki tavsiye verme; bilgi sun.
Kanun numarasini kaynaklarda gormuyorsan numarayi KESINLIKLE yazma; yalnizca
kanun adini belirt. Kaynaklar yetersizse hangi kanunun gecerli oldugunu kisaca
belirt ve daha fazla ayrintiya girme.

Yalnizca kullanicinin KISISEL hukuki durumu hakkinda soru sordugu durumlarda
(ornegin "benim hakkimda ne yapabilirim", "ne yapmam gerekiyor") yanit sonuna
bir paragraf olarak avukat yonlendirmesi ekle (tek cumle yeter):
- Ceza davasi, tutukluluk, gozalti, yargilama sureci
- Bosanma, velayet, nafaka davasi
- Is mahkemesi, tazminat davasi
- Icra ve iflas hukuku, haciz
Asagidaki GENEL BILGI sorularinda avukat yonlendirmesi KESINLIKLE EKLEME:
- Bir kanunun veya hukuki kurumun ne oldugunu soran sorular (orn. "istinaf nedir",
  "zamanasimi nedir", "ihtiyati tedbir nasil alinir", "delil tespiti nedir")
- Usul veya prosedur hakkinda genel aciklama istenen sorular

Yonlendirme formati: "Bu konu profesyonel hukuki destek gerektirmektedir;
baronuzun hukuki yardim burosu veya bir avukat ile gorusmenizi oneririz.
Adalet Bakanligi ALO 182 hattindan ucretsiz hukuki danismanlik alabilirsiniz."

KAYNAK YETERSIZLIGI KURALLARI — bu kurallari hicbir zaman esge:
- Kaynaklarda gecmeyen hicbir madde numarasi yazma. "m.X" veya "X. madde"
  ifadelerini yalnizca kaynak metninde gorunuyorsa kullan.
- Kaynaklarda gecmeyen hicbir ceza siniri (ay, yil, TL tutari) yazma.
- Kaynaklarda gecmeyen hicbir basvuru mercii, sure veya prosedur adimi yazma.
- Kaynaklar soruyu karsilamiyor ise su formati kullan:
  "Getirilen kaynaklar bu soruyu karsilamiyor. [Hangi kanunun gecerli
  oldugunu kisaca belirt, ornegin: '5352 sayili Adli Sicil Kanunu bu
  konuyu duzenlemektedir.'] Detayli bilgi icin baro hukuki yardim
  burosuna veya ALO 182 ye basvurunuzu oneririz." """

GENERAL_SYSTEM_PROMPT_EN = """You are a Turkish law information system. Use only the
provided statutes and Court of Cassation decisions as sources, but answer the user
in English. Ground concrete claims in the supplied sources. Do NOT include article
numbers, dates, or provisions that do not appear in the given sources. If the
sources are insufficient, say so clearly; do not fill gaps with your own knowledge.
Do not give legal advice; provide information only.

Append a lawyer referral paragraph ONLY when the user is asking about their OWN
specific legal situation (e.g. "what can I do", "what should I do"):
- Criminal proceedings, detention, custody, trial process
- Divorce, custody, alimony
- Labor court disputes and compensation lawsuits
- Enforcement and bankruptcy matters, seizures
Do NOT add a referral for general constitutional information, legal definitions, or
explanations of statutory provisions.

Referral format: "This matter requires professional legal support; we recommend
contacting your local bar association's legal aid office or a lawyer."

SOURCE INSUFFICIENCY RULES — never skip these:
- Do not write any article numbers not found in the sources. Only use "Art. X"
  or "Article X" if it appears verbatim in the retrieved source text.
- Do not write any penalty ranges (months, years, monetary amounts) absent from sources.
- Do not write any procedural steps, deadlines, or authorities absent from sources.
- If the sources do not answer the question, use this format:
  "The retrieved sources do not cover this question. [Briefly name the applicable
  statute, e.g. 'Law No. 5352 on Criminal Records governs this matter.']
  For details, please consult a bar association legal aid office or call ALO 182." """

DOCUMENT_SYSTEM_PROMPT_TR = """Sen Turk hukuku baglaminda belge analizi yapan bir hukuk
yardimcisisin. Yanitini Turkce ver. Birinci onceligin yuklenen belge metnidir.
Belgede acikca yer almayan bir hukmu veya riski varmis gibi yazma. Destekleyici
kanun maddeleri verildiyse, bunlari sadece ilgili olduklari yerde kullan. Hukuki
tavsiye verme; bilgi sun."""

DOCUMENT_SYSTEM_PROMPT_EN = """You are a document analysis assistant operating in the
context of Turkish law. Answer in English. Your first priority is the uploaded
document text. Do not invent clauses, obligations, or risks that are not actually
present in the document. If supporting legal sources are supplied, use them only
when they are relevant. Do not give legal advice; provide information only."""


def _strip_artifacts(text: str, *, strip_whitespace: bool = True) -> str:
    """Devanagari, CJK ve diger non-Turkish artifact karakterleri temizler."""
    import re
    text = re.sub(
        r"[\u0900-\u097f"   # Devanagari (Hindi vb.)
        r"\u4e00-\u9fff"    # CJK Unified Ideographs
        r"\u3000-\u303f"    # CJK Symbols & Punctuation
        r"\uff00-\uffef]+", # Halfwidth/Fullwidth Forms
        "",
        text,
    )
    return text.strip() if strip_whitespace else text


def _get_client() -> Groq:
    global _client
    if _client is None:
        _client = Groq(api_key=settings.GROQ_API_KEY)
    return _client


def _clip_text(text: str, max_chars: int) -> str:
    text = (text or "").strip()
    if len(text) <= max_chars:
        return text

    head = max_chars // 2
    tail = max_chars - head
    return f"{text[:head].rstrip()}\n[... clipped ...]\n{text[-tail:].lstrip()}"


def _source_header(payload: dict, index: int, language: str) -> str:
    prefix = "Source" if language == "en" else "Kaynak"
    kaynak_turu = payload.get("kaynak_turu", "")

    if kaynak_turu == "kanun":
        baslik = f"{payload.get('kanun_adi', '?')} - {payload.get('madde_no', '?')}"
        if payload.get("fikra_no"):
            baslik = f"{baslik} - {payload.get('fikra_no')}"
    elif kaynak_turu == "yargitay_karari":
        baslik = f"{payload.get('daire', 'Yargitay')} - {payload.get('karar_no', '?')}"
    else:
        baslik = payload.get("chunk_id", "?")

    return f"[{prefix} {index}] {baslik}"


def _build_source_context(
    chunks: list[dict],
    *,
    language: str,
    max_chars_per_source: int,
    max_total_chars: int,
) -> str:
    parts: list[str] = []
    used = 0

    for index, chunk in enumerate(chunks, start=1):
        payload = chunk["payload"]
        metin = _clip_text(payload.get("metin", ""), max_chars_per_source)
        if not metin:
            continue

        part = f"{_source_header(payload, index, language)}\n{metin}"
        projected = used + len(part)
        if parts and projected > max_total_chars:
            break

        parts.append(part)
        used = projected

    return "\n\n".join(parts)


def _extractive_fallback_answer(chunks: list[dict], language: str) -> str:
    if not chunks:
        return pick_text(
            language,
            "Bu soruya ait kaynak bulunamadi. Lutfen sorunuzu daha acik ve madde numarasiyla birlikte yazin.",
            "No matching source was found for this question. Please ask a more specific question and include the article number when possible.",
        )

    lines = [
        pick_text(
            language,
            "Groq anahtari olmadigi icin yanit, bulunan kaynaklardan dogrudan ozetlenmistir:",
            "Groq is not configured, so this answer is summarized directly from the retrieved sources:",
        )
    ]

    for index, chunk in enumerate(chunks[:3], start=1):
        payload = chunk["payload"]
        kaynak_turu = payload.get("kaynak_turu", "")
        if kaynak_turu == "kanun":
            baslik = f"{payload.get('kanun_adi', '?')} - {payload.get('madde_no', '?')}"
        elif kaynak_turu == "yargitay_karari":
            baslik = f"{payload.get('daire', 'Yargitay')} - {payload.get('karar_no', '?')}"
        else:
            baslik = payload.get("chunk_id", "Source")

        metin = _clip_text((payload.get("metin", "") or "").replace("\n", " "), 260)
        lines.append(f"{index}. {baslik}: {metin}")

    lines.append(informational_warning(language))
    return "\n".join(lines)


def _document_fallback_answer(
    *,
    language: str,
    question: str,
    documents: list[tuple[str, str]],
    chunks: list[dict],
    comparison: bool,
) -> str:
    intro = pick_text(
        language,
        "Dil modeli devre disi oldugu icin belge metninden dogrudan ozet cikartilmistir.",
        "The language model is unavailable, so this is a direct summary extracted from the uploaded document text.",
    )
    lines = [intro, ""]

    if comparison:
        lines.append(
            pick_text(
                language,
                f"Karsilastirma sorusu: {question}",
                f"Comparison question: {question}",
            )
        )
    else:
        lines.append(
            pick_text(
                language,
                f"Belge sorusu: {question}",
                f"Document question: {question}",
            )
        )

    for name, text in documents:
        label = pick_text(language, "Belge", "Document")
        lines.append(f"\n{label}: {name}")
        lines.append(_clip_text(text.replace("\n", " "), 700))

    if chunks:
        lines.append("")
        lines.append(
            pick_text(
                language,
                "Destekleyici hukuk kaynaklari:",
                "Supporting legal sources:",
            )
        )
        for index, chunk in enumerate(chunks[:2], start=1):
            payload = chunk["payload"]
            title = _source_header(payload, index, language)
            text = _clip_text(payload.get("metin", "").replace("\n", " "), 220)
            lines.append(f"{title}: {text}")

    lines.append("")
    lines.append(informational_warning(language))
    return "\n".join(lines)


def _chat_completion(*, system_prompt: str, user_prompt: str, max_tokens: int, stream: bool = False):
    return _get_client().chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        max_tokens=max_tokens,
        temperature=0.2,
        stream=stream,
    )


def _general_system_prompt(language: str) -> str:
    return GENERAL_SYSTEM_PROMPT_EN if language == "en" else GENERAL_SYSTEM_PROMPT_TR


def _document_system_prompt(language: str) -> str:
    return DOCUMENT_SYSTEM_PROMPT_EN if language == "en" else DOCUMENT_SYSTEM_PROMPT_TR


def generate_answer(soru: str, chunks: list[dict], language: str = "tr") -> str:
    language = normalize_language(language)
    if settings.MOCK_MODE or settings.MOCK_LLM or not settings.GROQ_API_KEY:
        return _extractive_fallback_answer(chunks, language)

    context = _build_source_context(
        chunks,
        language=language,
        max_chars_per_source=2200,
        max_total_chars=8500,
    )

    user_prompt = pick_text(
        language,
        f"Kaynaklar:\n{context}\n\nSoru: {soru}",
        f"Sources:\n{context}\n\nQuestion: {soru}",
    )

    try:
        response = _chat_completion(
            system_prompt=_general_system_prompt(language),
            user_prompt=user_prompt,
            max_tokens=1000,
        )
        return _strip_artifacts(response.choices[0].message.content.strip())
    except Exception as exc:
        raise RuntimeError(f"Groq yanit uretme hatasi: {exc}") from exc


def generate_answer_stream(soru: str, chunks: list[dict], language: str = "tr"):
    """Groq streaming yanit uretici. Her token icin str yield eder."""
    language = normalize_language(language)
    if settings.MOCK_MODE or settings.MOCK_LLM or not settings.GROQ_API_KEY:
        full = _extractive_fallback_answer(chunks, language)
        for word in full.split(" "):
            yield word + " "
        return

    context = _build_source_context(
        chunks,
        language=language,
        max_chars_per_source=2200,
        max_total_chars=8500,
    )

    user_prompt = pick_text(
        language,
        f"Kaynaklar:\n{context}\n\nSoru: {soru}",
        f"Sources:\n{context}\n\nQuestion: {soru}",
    )

    try:
        stream = _chat_completion(
            system_prompt=_general_system_prompt(language),
            user_prompt=user_prompt,
            max_tokens=1000,
            stream=True,
        )
        for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield _strip_artifacts(delta, strip_whitespace=False)
    except Exception as exc:
        raise RuntimeError(f"Groq streaming hatasi: {exc}") from exc


def generate_document_answer(
    *,
    soru: str,
    belge_metni: str,
    chunks: list[dict],
    language: str = "tr",
    belge_adi: str | None = None,
) -> str:
    language = normalize_language(language)
    if settings.MOCK_MODE or settings.MOCK_LLM or not settings.GROQ_API_KEY:
        return _document_fallback_answer(
            language=language,
            question=soru,
            documents=[(belge_adi or pick_text(language, "Yuklenen Belge", "Uploaded Document"), belge_metni)],
            chunks=chunks,
            comparison=False,
        )

    doc_title = belge_adi or pick_text(language, "Yuklenen Belge", "Uploaded Document")
    compact_document = _clip_text(belge_metni, 6000)
    legal_context = _build_source_context(
        chunks,
        language=language,
        max_chars_per_source=900,
        max_total_chars=2800,
    )
    legal_label = pick_text(language, "Destekleyici hukuk kaynaklari", "Supporting legal sources")
    no_sources = pick_text(language, "Ek hukuk kaynagi bulunamadi.", "No supporting legal sources were retrieved.")

    user_prompt = pick_text(
        language,
        (
            f"Kullanici sorusu: {soru}\n\n"
            f"{doc_title}:\n{compact_document}\n\n"
            f"{legal_label}:\n{legal_context or no_sources}\n\n"
            "Yaniti su duzende ver:\n"
            "1. Kisa ozet\n"
            "2. Riskli veya dikkat gerektiren maddeler\n"
            "3. Varsa destekleyen hukuk kaynaklari"
        ),
        (
            f"User question: {soru}\n\n"
            f"{doc_title}:\n{compact_document}\n\n"
            f"{legal_label}:\n{legal_context or no_sources}\n\n"
            "Structure the answer as:\n"
            "1. Short summary\n"
            "2. Risky or important clauses\n"
            "3. Supporting legal sources, if any"
        ),
    )

    try:
        response = _chat_completion(
            system_prompt=_document_system_prompt(language),
            user_prompt=user_prompt,
            max_tokens=1200,
        )
        return response.choices[0].message.content.strip()
    except Exception as exc:
        raise RuntimeError(f"Groq yanit uretme hatasi: {exc}") from exc


def generate_document_compare_answer(
    *,
    soru: str,
    belge1_metni: str,
    belge2_metni: str,
    chunks: list[dict],
    language: str = "tr",
    belge1_adi: str | None = None,
    belge2_adi: str | None = None,
) -> str:
    language = normalize_language(language)
    if settings.MOCK_MODE or settings.MOCK_LLM or not settings.GROQ_API_KEY:
        return _document_fallback_answer(
            language=language,
            question=soru,
            documents=[
                (belge1_adi or pick_text(language, "Belge 1", "Document 1"), belge1_metni),
                (belge2_adi or pick_text(language, "Belge 2", "Document 2"), belge2_metni),
            ],
            chunks=chunks,
            comparison=True,
        )

    document_1 = _clip_text(belge1_metni, 2500)
    document_2 = _clip_text(belge2_metni, 2500)
    legal_context = _build_source_context(
        chunks,
        language=language,
        max_chars_per_source=750,
        max_total_chars=1800,
    )
    legal_label = pick_text(language, "Destekleyici hukuk kaynaklari", "Supporting legal sources")
    no_sources = pick_text(language, "Ek hukuk kaynagi bulunamadi.", "No supporting legal sources were retrieved.")
    first_name = belge1_adi or pick_text(language, "Belge 1", "Document 1")
    second_name = belge2_adi or pick_text(language, "Belge 2", "Document 2")

    user_prompt = pick_text(
        language,
        (
            f"Karsilastirma sorusu: {soru}\n\n"
            f"{first_name}:\n{document_1}\n\n"
            f"{second_name}:\n{document_2}\n\n"
            f"{legal_label}:\n{legal_context or no_sources}\n\n"
            "Belge metinlerini oncele. Yaniti madde madde karsilastir ve su basliklari kullan:\n"
            "- Temel farklar\n"
            "- Riskli veya eksik hukumler\n"
            "- Pratik etkiler"
        ),
        (
            f"Comparison question: {soru}\n\n"
            f"{first_name}:\n{document_1}\n\n"
            f"{second_name}:\n{document_2}\n\n"
            f"{legal_label}:\n{legal_context or no_sources}\n\n"
            "Prioritize the document text itself. Compare the documents in bullet points and use these headings:\n"
            "- Main differences\n"
            "- Risky or missing clauses\n"
            "- Practical impact"
        ),
    )

    try:
        response = _chat_completion(
            system_prompt=_document_system_prompt(language),
            user_prompt=user_prompt,
            max_tokens=1200,
        )
        return response.choices[0].message.content.strip()
    except Exception as exc:
        raise RuntimeError(f"Groq yanit uretme hatasi: {exc}") from exc
