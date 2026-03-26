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

### Adım 3 — Skor Filtresi

```python
# rag/retriever.py

SCORE_THRESHOLD = 0.65  # Test ile belirlenecek, başlangıç değeri

def filter_by_score(chunks: list[dict]) -> list[dict]:
    filtered = [c for c in chunks if c["skor"] >= SCORE_THRESHOLD]
    if not filtered:
        # Hiç chunk kalmadıysa en yüksek skorlu 1 tanesini döndür
        return [max(chunks, key=lambda c: c["skor"])]
    return filtered
```

### Adım 4 — Yanıt Üretme

```python
# rag/generator.py

SYSTEM_PROMPT = """
Sen bir Türk hukuku bilgi sistemisin. Sana verilen kanun maddeleri ve
Yargıtay kararlarını kaynak alarak kullanıcının sorusunu Türkçe yanıtla.
Her iddiayı kaynak chunk'a dayandır. Eğer verilen kaynaklardan yanıt
üretemiyorsan bunu açıkça belirt.
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
│   ├── user.py              # User SQLAlchemy modeli
│   ├── refresh_token.py     # RefreshToken modeli
│   ├── chat_history.py      # ChatHistory + save_chat_pair()
│   ├── feedback.py          # MessageFeedback modeli
│   └── enums.py             # UserRole enum
├── routers/
│   ├── auth.py              # /auth/*
│   ├── chat.py              # /chat/*
│   ├── feedback.py          # /feedback
│   ├── documents.py         # /documents/analyze
│   ├── admin.py             # /admin/stats/*
│   └── templates.py         # /templates/*
├── services/
│   ├── chat_service.py      # resolve_conversation_id, save_chat_pair
│   ├── document_service.py  # pdf_metin_cikar (pypdf, 10MB/15k char limit)
│   ├── feedback_service.py  # upsert feedback
│   ├── admin_service.py     # istatistik sorguları
│   └── template_service.py  # TEMPLATES dict + reportlab PDF üretimi
├── db/
│   └── session.py           # SQLAlchemy engine + get_db()
├── migrations/versions/
│   ├── 20260305_0001_*      # auth tabloları
│   ├── 20260305_0002_*      # chat_history + misafir desteği
│   ├── 20260316_0003_*      # category kolonu
│   └── 20260317_0004_*      # message_feedback tablosu
└── tests/
    └── test_*.py            # pytest testleri (Docker üzerinden çalıştırılır)
```
