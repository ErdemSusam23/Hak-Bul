from config import GROQ_API_KEY, MOCK_LLM

SYSTEM_PROMPT = """
Sen bir Türk hukuku bilgi sistemisin. Sana verilen kanun maddeleri ve
Yargıtay kararlarını kaynak alarak kullanıcının sorusunu Türkçe yanıtla.
Her iddiayı kaynak chunk'a dayandır. Eğer verilen kaynaklardan yanıt
üretemiyorsan bunu açıkça belirt.
"""

def build_context(chunks: list[dict]) -> str:
    parts = []
    for c in chunks:
        p = c["payload"]
        baslik = p.get("kanun_adi", p.get("karar_no", "Kaynak"))
        parts.append(f"[{baslik}]\n{p['metin']}")
    return "\n\n".join(parts)

def generate_answer(soru: str, chunks: list[dict]) -> str:
    if MOCK_LLM:
        return f"[MOCK YANIT] '{soru}' sorusu için {len(chunks)} kaynak bulundu."

    from groq import Groq
    client = Groq(api_key=GROQ_API_KEY)
    context = build_context(chunks)
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Kaynaklar:\n{context}\n\nSoru: {soru}"},
        ],
        max_tokens=1000,
    )
    return response.choices[0].message.content