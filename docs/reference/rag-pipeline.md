# RAG Pipeline

`backend-docs.md`'den bölündü — v2.0`

---

## Genel Akış

```
Kullanıcı sorusu
      │
      ▼
[1] rewrite_query()       ← Groq API → llama-3.1-8b-instant
      │
      ▼
[2] retrieve_chunks()     ← Qdrant Cloud (top-5)
      │
      ▼
[3] filter_by_score()     ← Uygulama içi (eşik altı chunk'lar elenir)
      │
      ▼
[4] generate_answer()     ← Groq API → llama-3.3-70b-versatile
      │
      ▼
[5] format_response()     ← AskResponse JSON
```

| Adım | Fonksiyon | Girdi | Çıktı | Servis |
|------|-----------|-------|-------|--------|
| 1 | `rewrite_query()` | Kullanıcı sorusu | Hukuki terminolojiyle zenginleştirilmiş sorgu | Groq — llama-3.1-8b-instant |
| 2 | `retrieve_chunks()` | Rewrite edilmiş sorgu | Top-5 chunk listesi + skorlar | Qdrant Cloud |
| 3 | `filter_by_score()` | Chunk listesi | Eşik altı chunk'lar elendi | Uygulama içi |
| 4 | `generate_answer()` | Filtreli chunk'lar + orijinal soru | Kaynak atıflı Türkçe yanıt | Groq — llama-3.3-70b-versatile |
| 5 | `format_response()` | Yanıt + chunk metadata | AskResponse JSON | Uygulama içi |

---

## Adım Adım Detay

### Adım 1 — Query Rewriting

```python
# rag/query_rewriter.py

SYSTEM_PROMPT = """
Sen bir Türk hukuku uzmanısın. Kullanıcının günlük Türkçe ile sorduğu soruyu,
Türk hukuk mevzuatı ve Yargıtay kararlarında geçen teknik terminolojiyle
yeniden yaz. Sadece yeniden yazılmış sorguyu döndür, açıklama yapma.
"""

def rewrite_query(soru: str) -> str:
    response = groq_client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "system", "content": SYSTEM_PROMPT},
                  {"role": "user", "content": soru}],
        max_tokens=200
    )
    return response.choices[0].message.content
```

### Adım 2 — Retrieval

```python
# rag/retriever.py

def retrieve_chunks(query: str, top_n: int = 5) -> list[dict]:
    embedding = embedder.encode(query)  # sentence-transformers
    results = qdrant_client.search(
        collection_name="hukuk_chunks",
        query_vector=embedding,
        limit=top_n,
        with_payload=True
    )
    return [{"payload": r.payload, "skor": r.score} for r in results]
```

### Adım 3 — Skor Filtresi ve Zayıf Sorgu Tespiti

```python
# rag/retriever.py

def filter_by_score(chunks: list[dict], threshold: float = settings.SCORE_THRESHOLD) -> list[dict]:
    filtered = [c for c in chunks if c["skor"] >= threshold]
    if not filtered:
        # Hiç chunk kalmadıysa en yüksek skorlu 1 tanesini döndür
        return [max(chunks, key=lambda c: c["skor"])]
    return filtered
```

Tüm chunk'ların `max_skor < SCORE_THRESHOLD` ise sorgu `weak_queries` tablosuna loglanır (soru metni, max skor, kategori). Bu veriler admin panelinden izlenebilir (`GET /admin/weak-queries`).

### Adım 4 — Yanıt Üretme

```python
# rag/generator.py

SYSTEM_PROMPT = """
Sen bir Turk hukuku bilgi sistemisin. Sana verilen kanun maddeleri ve
Yargitay kararlarini kaynak alarak kullanicinin sorusunu Turkce yanitla.
Her iddiayi kaynak chunk'a dayandir. Eger verilen kaynaklardan yanit
uretemiyorsan bunu acikca belirt. Hukuki tavsiye verme; bilgi sun.

Eger kullanicinin sorusu su konulardan birini iceriyorsa yanit sonuna bir paragraf olarak
avukat yonlendirmesi ekle:
- Ceza davasi, tutukluluk, gozalti, yargilama sureci
- Bosanma, velayet, nafaka davasi
- Is mahkemesi, tazminat davasi
- Icra ve iflas hukuku, haciz
- Multeciler, vatandaslik, oturma izni
"""

def generate_answer(soru: str, chunks: list[dict]) -> str:
    context = build_context(chunks)
    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Kaynaklar:\n{context}\n\nSoru: {soru}"}
        ],
        max_tokens=1000
    )
    return response.choices[0].message.content
```

**Avukat Yönlendirmesi:** Kritik konularda (ceza, boşanma, icra, tazminat, mültecilik) yanıt sonuna otomatik olarak "Adalet Bakanlığı ALO 182 hattından ücretsiz hukuki danışmanlık alabilirsiniz." paragrafı eklenir.

**SSE Streaming:** `generate_answer_stream()` ile aynı Groq çağrısı token token yield edilir; `/ask/stream` endpoint'i bu fonksiyonu kullanır.

---

## Hata Yönetimi

| Senaryo | Davranış | HTTP Yanıt |
|---------|----------|------------|
| Groq API timeout (>10s) | 503 döner, retry önerilir | `503 + retry_after` |
| Qdrant bağlantı hatası | 503 döner | `503 + retry_after` |
| Hiç chunk bulunamadı (skor < eşik) | En yüksek 1 chunk ile devam et | `200` (düşük güven uyarısı ile) |
| Groq rate limit (429) | Exponential backoff, 3 deneme | `200` (gecikmeli) veya `503` |
| Soru çok kısa (<10 karakter) | Validasyon hatası | `422` |

---

## Groq API Kullanım Özeti

| Endpoint | Model | Maks Token | Tahmini Süre |
|----------|-------|------------|--------------|
| Query Rewriting | `llama-3.1-8b-instant` | 200 | < 1 saniye |
| Yanıt Üretme | `llama-3.3-70b-versatile` | 1000 | 2-4 saniye |
| **Toplam p95 yanıt süresi** | — | — | **< 10 saniye (hedef)** |

> **Groq Free Tier:** Dakikada 30 istek, günde 14.400 istek. Geliştirme sırasında query rewriting adımı için `MOCK_MODE=true` kullanılması önerilir — böylece 70B model harcaması azalır.

---

## Backend Dizin Yapısı

```
backend/
├── main.py                  # FastAPI app, rate limiter, /ask + /search + /health
├── schemas.py               # Tüm Pydantic modelleri
├── config.py                # Environment variables (Settings sınıfı)
├── rag/
│   ├── pipeline.py          # run_pipeline() — adımları zincirler
│   ├── categorizer.py       # Keyword tabanlı kategori tespiti (8 kategori)
│   ├── query_rewriter.py    # Groq llama-3.1-8b-instant ile sorgu optimizasyonu
│   ├── retriever.py         # Qdrant Cloud araması; yerel JSON fallback
│   └── generator.py         # Groq llama-3.3-70b-versatile ile yanıt üretimi
├── auth/
│   ├── dependencies.py      # get_current_user_optional, require_roles
│   ├── jwt_service.py       # JWT üretimi / doğrulama
│   └── security.py          # bcrypt hash
├── models/
│   ├── user.py                   # User SQLAlchemy modeli
│   ├── refresh_token.py          # RefreshToken modeli
│   ├── chat_history.py           # ChatHistory + save_chat_pair()
│   ├── feedback.py               # MessageFeedback modeli
│   ├── weak_query.py             # WeakQuery modeli — düşük skorlu sorgu loglama
│   ├── shared_conversation.py    # SharedConversation modeli — paylaşım token'ları
│   └── enums.py                  # UserRole enum
├── routers/
│   ├── auth.py              # /auth/* (profil + hesap silme dahil)
│   ├── chat.py              # /chat/* (export, share, delete, rename dahil)
│   ├── feedback.py          # /feedback
│   ├── documents.py         # /documents/analyze + /documents/compare
│   ├── admin.py             # /admin/stats/*, /admin/users/*, /admin/weak-queries
│   └── templates.py         # /templates/*
├── services/
│   ├── chat_service.py      # resolve_conversation_id, save_chat_pair
│   ├── document_service.py  # pdf_metin_cikar (pypdf, 10MB/15k char limit)
│   ├── feedback_service.py  # upsert feedback
│   ├── admin_service.py     # istatistik sorguları + kullanıcı yönetimi
│   └── template_service.py  # TEMPLATES dict + reportlab PDF üretimi
├── db/
│   └── session.py           # SQLAlchemy engine + get_db()
├── migrations/versions/
│   ├── 20260305_0001_*      # auth tabloları
│   ├── 20260305_0002_*      # chat_history + misafir desteği
│   ├── 20260316_0003_*      # category kolonu
│   ├── 20260317_0004_*      # message_feedback tablosu
│   ├── 20260317_0005_*      # title kolonu (sohbet başlıkları)
│   └── 20260326_0006_*      # weak_queries + shared_conversations tabloları
└── tests/
    └── test_*.py            # pytest testleri (Docker üzerinden çalıştırılır)
```
