from config import GROQ_API_KEY, MOCK_LLM

SYSTEM_PROMPT = """
Sen bir Türk hukuku bilgi sistemisin. Görevin, sana verilen kaynak metinlerini
kullanarak kullanıcının sorusunu yanıtlamaktır.

## ÖNCE BU KARARI VER
Sana verilen kaynaklara bak:
- Konuyla ilgili (doğrudan veya dolaylı) bir bilgi var mı?
  → EVET: Aşağıdaki Üretim Kurallarıyla yanıt üret.
  → HAYIR: Yalnızca şunu söyle: "Elimdeki kaynaklarda bu konuya ilişkin bilgi
    bulunmamaktadır. Lütfen bir hukuk danışmanına başvurun."
  → EMIN DEĞİLSEN: Kısmi bilgiyi aktar, "bilgi yok" deme.

## ÜRETİM KURALLARI
1. Hangi kanun maddesi veya karar dayanak alındıysa açıkça belirt.
   Örn: "4857 sayılı İş Kanunu Madde 71 uyarınca..."
2. Yalnızca sana verilen kaynaklarda adı geçen kanun ve maddeleri zikret.
   Kaynaklarda olmayan hiçbir kanun adı veya madde numarası üretme.
3. Kanun maddesini olduğu gibi aktar. Kullanıcının yaşı, tutarı veya durumuna
   kendi başına uygulama yapma — maddeyi aktar, kullanıcı kendisi uygulasın.
4. Yanıtının sonuna her zaman şunu ekle:
   "Bu yanıt bilgi amaçlıdır ve hukuki tavsiye niteliği taşımaz."
"""

def build_context(chunks: list[dict]) -> str:
    parts = []
    for c in chunks:
        p = c["payload"]

        if p.get("kaynak_turu") == "kanun":
            kanun_adi = p.get("kanun_adi", "Kanun")
            madde_no = p.get("madde_no", "")
            baslik = f"{kanun_adi} — {madde_no}" if madde_no else kanun_adi
        elif p.get("kaynak_turu") == "yargitay_karari":
            daire = p.get("daire", "")
            karar_no = p.get("karar_no", "Karar")
            bolum = p.get("karar_bolumu", "")
            baslik = f"Yargıtay {daire} — {karar_no} ({bolum})" if daire else karar_no
        else:
            baslik = p.get("kanun_adi", p.get("karar_no", "Kaynak"))

        parts.append(f"[{baslik}]\n{p['metin']}")
    return "\n\n".join(parts)


def generate_answer(soru: str, chunks: list[dict], rewritten_query: str = None) -> str:
    if MOCK_LLM:
        return f"[MOCK YANIT] '{soru}' sorusu için {len(chunks)} kaynak bulundu."

    from groq import Groq
    client = Groq(api_key=GROQ_API_KEY)
    context = build_context(chunks)

    soru_blogu = f"Kullanıcının sorusu: {soru}"
    if rewritten_query and rewritten_query != soru:
        soru_blogu += f"\nHukuki terminolojiyle yeniden yazılmış hali: {rewritten_query}"

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Kaynaklar:\n{context}\n\n{soru_blogu}"},
        ],
        max_tokens=1000,
    )
    return response.choices[0].message.content