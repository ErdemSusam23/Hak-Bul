# RAG Pipeline

`backend-docs.md`'den bölündü — v2.0`

---

## Genel Akış

```
Kullanıcı sorusu
      │
      ▼
[1] categorize()          ← Uygulama içi keyword eşleme
      │
      ▼
[2] rewrite_query()       ← Groq API → llama-3.1-8b-instant
      │
      ▼
[3] retrieve_chunks()     ← Qdrant Cloud + yerel kanun korpusu fallback/merge
      │
      ▼
[4] filter_by_score()     ← Uygulama içi (mulga filtreleme + skor eşiği)
      │
      ▼
[5] generate_answer()     ← Groq API → llama-3.3-70b-versatile
      │
      ▼
[6] format_response()     ← AskResponse JSON
```

| Adım | Fonksiyon | Girdi | Çıktı | Servis |
|------|-----------|-------|-------|--------|
| 1 | `get_kategorilendirici().kategorile()` | Kullanıcı sorusu | 14 kategoriden biri | Uygulama içi |
| 2 | `rewrite_query()` | Kullanıcı sorusu | Vektör aramaya uygun kısa sorgu | Groq — llama-3.1-8b-instant |
| 3 | `retrieve_chunks()` | Rewrite edilmiş sorgu | Qdrant sonucu + gerektiğinde yerel kanun sonuçları | Qdrant Cloud + local corpus |
| 4 | `filter_by_score()` | Chunk listesi | Mulga maddeler ayıklandı, eşik uygulandı | Uygulama içi |
| 5 | `generate_answer()` | Filtreli chunk'lar + orijinal soru | Kaynak atıflı TR/EN yanıt | Groq — llama-3.3-70b-versatile |
| 6 | `format_response()` | Yanıt + chunk metadata | AskResponse JSON | Uygulama içi |

---

## Adım Adım Detay

### Adım 1 — Kategori Tespiti

`pipeline.retrieve_context()` ilk olarak soruyu keyword tabanlı kategorizer'dan geçirir. Bu adım retrieval'dan bağımsızdır ve admin istatistikleri ile weak query loglarında kullanılır.

Kategori kümesi 14 başlıktan oluşur: İş, Medeni, Ceza, Ticaret, Tüketici, Taşınmaz Mülk, İdare, Vergi, Sosyal Güvenlik, Fikri Mülkiyet, Bilişim, Anayasa, Usul, Genel.

### Adım 2 — Query Rewriting

```python
# rag/query_rewriter.py

SYSTEM_PROMPT = """
Sen bir Türk hukuku uzmanısın. Kullanıcının sorusunu,
vektör arama için optimize edilmiş kısa bir arama sorgusuna dönüştür.
"""

def rewrite_query(soru: str) -> str:
    if _has_explicit_legal_reference(soru):
        return soru

    response = groq_client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "system", "content": SYSTEM_PROMPT},
                  {"role": "user", "content": soru}],
        max_tokens=60,
        temperature=0.0,
    )
    return response.choices[0].message.content
```

Davranış notları:

- Kullanıcı soru içinde açık kanun/madde referansı verdiyse (`madde`, `md`, 3-4 haneli kanun no), rewrite atlanır ve orijinal sorgu kullanılır.
- Groq yapılandırılmamışsa veya çağrı hata verirse pipeline kırılmaz; orijinal sorguyla devam edilir.

### Adım 3 — Retrieval

```python
# rag/retriever.py

def retrieve_chunks(query: str, top_n: int = 5) -> list[dict]:
    embedding = model.encode(f"query: {query}").tolist()
    qdrant_results = _query_qdrant(
        embedding=embedding,
        top_n=top_n * 2,
        kaynak_turu=kaynak_turu,
    )
    raw = [{"payload": r.payload, "skor": r.score} for r in qdrant_results]

    if settings.ALLOW_LOCAL_RETRIEVAL_FALLBACK:
        local_kanun = _retrieve_local(query=query, top_n=top_n * 2, kaynak_turu="kanun")
        raw = _merge_scored_chunks(local_kanun, raw, secondary_boost=0.85)

    return _deduplicate_chunks(raw)[:top_n]
```

Davranış notları:

- Qdrant yapılandırılmamışsa ve `ALLOW_LOCAL_RETRIEVAL_FALLBACK=true` ise yerel JSON korpusu kullanılır.
- Qdrant erişilebilir olsa bile bazı kanun sorgularında yerel kanun sonuçları Qdrant sonuçlarıyla birleştirilir.
- Retrieval katmanı tamamen mulga metinleri sonradan filtreleyebilmek için ham payload'ı taşır.

### Adım 4 — Skor Filtresi ve Zayıf Sorgu Tespiti

```python
# rag/retriever.py

def filter_by_score(chunks: list[dict], threshold: float = settings.SCORE_THRESHOLD) -> list[dict]:
    chunks = [c for c in chunks if not _is_tamamen_mulga(c["payload"].get("metin", ""))]
    filtered = [c for c in chunks if c["skor"] >= threshold]
    if not filtered:
        # Hiç chunk kalmadıysa en yüksek skorlu ilk 5 taneyi döndür
        return sorted(chunks, key=lambda c: c["skor"], reverse=True)[:5]
    return filtered
```

Tüm chunk'ların `max_skor < SCORE_THRESHOLD` ise sorgu `weak_queries` tablosuna loglanır (soru metni, max skor, kategori). Bu veriler admin panelinden izlenebilir (`GET /admin/weak-queries`).

### Adım 5 — Yanıt Üretme

`rag/generator.py` — `GENERAL_SYSTEM_PROMPT_TR` / `GENERAL_SYSTEM_PROMPT_EN` sabitleri kullanılır.

Sistem prompt'u üç katmandan oluşur:

**Katman 1 — Temel kural:** Yalnızca verilen kaynaklara dayan; kaynaklarda geçmeyen madde numarası, tarih veya hüküm ekleme. Kanun numarasını kaynakta görmüyorsan yazma; yalnızca kanun adını belirt.

**Katman 2 — Avukat yönlendirmesi (koşullu):** Yönlendirme yalnızca kullanıcının KİŞİSEL hukuki durumuyla ilgili soru sorduğu durumlarda (ör. "benim hakkımda ne yapabilirim") eklenir:
- Ceza davası, tutukluluk, gözaltı, yargılama süreci
- Boşanma, velayet, nafaka davası
- İş mahkemesi, tazminat davası
- İcra ve iflas hukuku, haciz

Genel bilgi soruları ("istinaf nedir", "zamanaşımı nedir") için yönlendirme **eklenmez**.

Format: "Adalet Bakanlığı ALO 182 hattından ücretsiz hukuki danışmanlık alabilirsiniz."

**Katman 3 — Kaynak Yetersizliği Kuralları:** Kaynaklar soruyu karşılamıyorsa asla boşluk doldurma:
- Kaynaklarda geçmeyen madde numarası ("m.X", "X. madde") yazma
- Kaynaklarda geçmeyen ceza sınırı (ay, yıl, TL tutarı) yazma
- Kaynaklar yetersizse: hangi kanunun geçerli olduğunu kısaca belirt, ALO 182'ye yönlendir

**SSE Streaming:** `generate_answer_stream()` ile aynı Groq çağrısı token token yield edilir; `/ask/stream` endpoint'i bu fonksiyonu kullanır.

### Adım 6 — Kaynak Özetleme (Source Summary)

`pipeline._format_sources()` her chunk için `metin_ozet` alanı üretir. Sorguya göre en ilgili cümleler seçilir:

- Metindeki cümleler sorgu token örtüşmesiyle puanlanır
- Süreli sorularda ("süre nedir", "kaç gün") sayı içeren veya "iş günü / gün / ay / yıl" geçen cümleler ek puan alır
- En yüksek puanlı 3 cümle seçilir, kaynak sırasıyla sıralanır, 280 karakter sınırına kesilir
- `metin_ozet` API yanıtında chat kartlarında gösterilir; tam `metin` alanı frontend'e gönderilmez

---

## Hata Yönetimi

| Senaryo | Davranış | HTTP Yanıt |
|---------|----------|------------|
| Groq API timeout (>10s) | 503 döner, retry önerilir | `503 + retry_after` |
| Qdrant bağlantı hatası | `ALLOW_LOCAL_RETRIEVAL_FALLBACK=true` ise local corpus fallback; `false` ise 503 | `200` veya `503 + retry_after` |
| Hiç chunk eşik üstüne çıkmadı | Mulga olmayan en yüksek skorlu ilk 5 chunk ile devam et | `200` (düşük güven riski ile) |
| Groq çağrısı hata verdi | Rewrite aşamasında orijinal sorguya düşer; üretim aşamasında `RuntimeError` → HTTP hata katmanı | `500` veya `503` |
| Soru çok kısa (<10 karakter) | Validasyon hatası | `422` |

### Production Hard-Fail Politikası

Production'da dış bağımlılık kesintisinde sessiz fallback yerine kontrollü hata döndürmek için:

```env
STRICT_UPSTREAMS=true
ALLOW_LOCAL_RETRIEVAL_FALLBACK=false
```

Bu kombinasyonda `/ask` ve `/ask/stream` endpoint'leri Groq/Qdrant erişilemiyorsa `503` döner.

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
│   ├── categorizer.py       # Keyword tabanlı kategori tespiti (14 kategori)
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
│   ├── forum.py                  # ForumThread / ForumReply / ForumVote
│   └── enums.py                  # UserRole, MessageRole, ForumVoteType enum'ları
├── routers/
│   ├── auth.py              # /auth/* (profil + hesap silme dahil)
│   ├── chat.py              # /chat/* (export, share, delete, rename dahil)
│   ├── feedback.py          # /feedback
│   ├── documents.py         # /documents/analyze + /documents/compare
│   ├── admin.py             # /admin/stats/*, /admin/users/*, /admin/weak-queries
│   ├── templates.py         # /templates/*
│   └── forum.py             # /forum/*
├── services/
│   ├── chat_service.py      # resolve_conversation_id, save_chat_pair
│   ├── document_service.py  # pdf_metin_cikar (pypdf, 10MB/15k char limit)
│   ├── feedback_service.py  # upsert feedback
│   ├── admin_service.py     # istatistik sorguları + kullanıcı yönetimi
│   ├── template_service.py  # TEMPLATES dict + reportlab PDF üretimi
│   └── forum_service.py     # Thread/reply/vote iş mantığı
├── db/
│   └── session.py           # SQLAlchemy engine + get_db()
├── migrations/versions/
│   ├── 20260305_0001_*      # auth tabloları
│   ├── 20260305_0002_*      # chat_history + misafir desteği
│   ├── 20260316_0003_*      # category kolonu
│   ├── 20260317_0004_*      # message_feedback tablosu
│   ├── 20260317_0005_*      # title kolonu (sohbet başlıkları)
│   ├── 20260326_0006_*      # weak_queries + shared_conversations tabloları
│   ├── 20260326_0007_*      # chat_history.deleted_at
│   ├── 20260330_0008_*      # lawyer role
│   └── 20260330_0009_*      # forum tabloları
└── tests/
    └── test_*.py            # pytest testleri (local veya Docker)
```
