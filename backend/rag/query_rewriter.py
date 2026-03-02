from config import GROQ_API_KEY, MOCK_LLM

SYSTEM_PROMPT = """
Sen bir Türk hukuku uzmanısın. Kullanıcının günlük Türkçe ile sorduğu soruyu,
Türk hukuk mevzuatı ve Yargıtay kararlarında geçen teknik terminolojiyle
yeniden yaz. Sadece yeniden yazılmış sorguyu döndür, açıklama yapma.
"""

def rewrite_query(soru: str) -> str:
    if MOCK_LLM:
        return f"[MOCK] {soru}"

    from groq import Groq
    client = Groq(api_key=GROQ_API_KEY)
    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": soru},
        ],
        max_tokens=200,
    )
    return response.choices[0].message.content