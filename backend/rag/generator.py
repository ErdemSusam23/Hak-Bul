from config import GROQ_API_KEY, MOCK_LLM

SYSTEM_PROMPT = """
Sen bir Türk hukuku bilgi sistemisin. Sana verilen kaynak metinleri dışında 
HİÇBİR bilgi kullanamazsın. Kendi genel bilginle asla yorum yapma.

Kurallar:
1. Yanıtındaki her cümle, sana verilen kaynaklardan birine dayanmak ZORUNDADIR.
2. Eğer soru, verilen kaynaklarda DOĞRUDAN yanıt bulamıyorsa şunu söyle:
   "Elimdeki kaynaklarda bu soruya doğrudan yanıt verecek bilgi bulunmamaktadır. 
    Lütfen bir hukuk danışmanına başvurun."
3. Kaynaklarda kısmen bilgi varsa sadece o kısmı aktar, eksik kısmı tahmin etme.
4. "Genellikle", "muhtemelen", "olabilir" gibi belirsiz ifadeler kullanma.
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