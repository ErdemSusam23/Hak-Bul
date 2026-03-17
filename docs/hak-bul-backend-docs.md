# 🏛️ Türk Hukuk Asistanı — Backend Teknik Dokümantasyonu

`v1.0 — Bitirme Projesi — 2025`

> Bu doküman 3 bölümden oluşur:
> 1. Veri Şeması (Qdrant koleksiyonu + chunk metadata)
> 2. API Dokümantasyonu (endpoint'ler, rate limiting)
> 3. RAG Pipeline Akış Dokümantasyonu

---

## 1. Veri Şeması

_Sistem geleneksel bir SQL veritabanı kullanmaz. Tüm vektör araması Qdrant Cloud üzerinde, rate limiting ise uygulama belleğinde (in-memory) tutulur._

### 1.1 Qdrant Koleksiyon Konfigürasyonu

| Parametre | Değer | Açıklama |
|-----------|-------|----------|
| Koleksiyon adı | `hukuk_chunks` | Tek koleksiyon, tüm chunk türleri burada |
| Vector size | `768` | intfloat/multilingual-e5-base |
| Distance metric | `Cosine` | Semantic benzerlik için en uygun metrik |
| Quantization | Kapalı (MVP) | Free tier için yeterli performans |
| Indexing threshold | 20.000 vektör | Qdrant default, MVP için sorun yok |

### 1.2 Chunk Metadata Şeması

> ⚠️ Her chunk Qdrant'a hem embedding vektörü hem de aşağıdaki payload (metadata) ile birlikte yüklenir. Retrieval sonrasında kaynak atıfı bu alanlardan oluşturulur.

**Zorunlu Alanlar (tüm chunk türleri)**

| Alan | Tip | Örnek Değer | Açıklama |
|------|-----|-------------|----------|
| `kaynak_turu` | string | `"kanun"` | `kanun` \| `yonetmelik` \| `yargitay_karari` |
| `hukuk_alani` | string | `"is_hukuku"` | MVP'de sabit, ilerleyen fazda genişler |
| `yil` | integer | `2003` | Yürürlük yılı veya karar yılı |
| `metin` | string | `"Madde 17 — ..."` | Chunk'un ham metni (arama skoru hariç) |
| `url` | string \| null | `"https://www.mevzuat.gov.tr/..."` | Kaynağın resmi bağlantısı (yoksa `null`) |
| `chunk_id` | string | `"kanun_4857_m17"` | Benzersiz ID, debug ve loglama için |

**Kanun Chunk'larına Özel Alanlar**

| Alan | Tip | Örnek Değer |
|------|-----|-------------|
| `kanun_adi` | string | `"4857 Sayılı İş Kanunu"` |
| `kanun_no` | string | `"4857"` |
| `madde_no` | string | `"Madde 17"` |
| `fikra_no` | string \| null | `"Fıkra 2"` veya `null` |

**Yargıtay Kararı Chunk'larına Özel Alanlar**

| Alan | Tip | Örnek Değer |
|------|-----|-------------|
| `karar_no` | string | `"2023/1234"` |
| `daire` | string | `"9. Hukuk Dairesi"` |
| `karar_bolumu` | string | `ozet` \| `gerekce` \| `sonuc` |
| `tarih` | string | `"2023-05-12"` |

### 1.3 Örnek Chunk — Kanun

```json
{
  "id": "kanun_4857_m17",
  "vector": [0.023, -0.441, ...],
  "payload": {
    "kaynak_turu": "kanun",
    "hukuk_alani": "is_hukuku",
    "kanun_adi": "4857 Sayılı İş Kanunu",
    "kanun_no": "4857",
    "madde_no": "Madde 17",
    "fikra_no": null,
    "yil": 2003,
    "metin": "Madde 17 — Belirsiz süreli iş sözleşmelerinin...",
    "url": "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=4857&MevzuatTur=1&MevzuatTertip=5",
    "chunk_id": "kanun_4857_m17"
  }
}
```

### 1.4 Örnek Chunk — Yargıtay Kararı

```json
{
  "id": "yargitay_2023_1234_gerekce",
  "vector": [0.091, 0.317, ...],
  "payload": {
    "kaynak_turu": "yargitay_karari",
    "hukuk_alani": "is_hukuku",
    "karar_no": "2023/1234",
    "daire": "9. Hukuk Dairesi",
    "karar_bolumu": "gerekce",
    "tarih": "2023-05-12",
    "yil": 2023,
    "metin": "...kıdem tazminatına hak kazanabilmek için...",
    "url": "https://karararama.yargitay.gov.tr/",
    "chunk_id": "yargitay_2023_1234_gerekce"
  }
}
```

### 1.5 Veri Hacmi Tahmini

| İçerik | Adet | Tahmini Chunk | Vektör Boyutu |
|--------|------|---------------|---------------|
| Kanun metinleri | 3-5 kanun | ~1.000-2.000 | ~6-12 MB |
| Yargıtay kararları | 500-1.000 karar | ~2.000-3.000 | ~12-18 MB |
| **Toplam** | — | **~3.000-5.000** | **~18-30 MB** (Qdrant 1GB free tier içinde) |

---

## 2. API Dokümantasyonu

```
Base URL (dev):  http://localhost:8000
Base URL (prod): https://turk-hukuk-api.onrender.com
```

Tüm yanıtlar JSON formatındadır. FastAPI otomatik `/docs` (Swagger UI) ve `/redoc` üretir.

### 2.1 Rate Limiting

Auth sistemi yoktur. Rate limiting IP bazlı, uygulama belleğinde (in-memory) tutulur. Library: `slowapi`

| Parametre | Değer |
|-----------|-------|
| Limit | 20 istek / dakika / IP |
| Scope | Sadece `POST /ask` endpoint'i |
| Aşım yanıtı | HTTP 429 Too Many Requests |
| Reset süresi | 60 saniye (sabit pencere) |
| Prod'da kalıcı depolama | Yok — server restart'ta sıfırlanır (MVP için yeterli) |

```python
# main.py
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.post("/ask")
@limiter.limit("20/minute")
async def ask(request: Request, body: AskRequest):
    ...
```

### 2.2 Genel Hata Kodları

| HTTP Kodu | Durum | Açıklama |
|-----------|-------|----------|
| `200` | OK | Başarılı yanıt |
| `400` | Bad Request | Eksik/geçersiz istek gövdesi |
| `422` | Unprocessable Entity | FastAPI validasyon hatası |
| `429` | Too Many Requests | Rate limit aşıldı |
| `503` | Service Unavailable | Groq API veya Qdrant erişilemiyor |
| `500` | Internal Server Error | Beklenmedik sunucu hatası |

### 2.3 Endpoint: POST /ask

_Ana endpoint. Kullanıcının hukuki sorusunu alır, RAG pipeline'ı çalıştırır, kaynak atıflı yanıt döner._

**Request**

```json
{
  "soru": "string",     // Zorunlu. Min 10, max 1000 karakter.
  "max_kaynak": 5       // Opsiyonel. Kaç kaynak gösterilsin? Default: 5
}
```

**Response — Başarılı (200)**

```json
{
  "yanit": "string",
  "kaynaklar": [
    {
      "kaynak_turu": "kanun",
      "baslik": "4857 Sayılı İş Kanunu — Madde 17",
      "metin_ozet": "string",
      "skor": 0.87
    },
    {
      "kaynak_turu": "yargitay_karari",
      "baslik": "Yargıtay 9. HD — 2023/1234",
      "metin_ozet": "string",
      "skor": 0.81
    }
  ],
  "uyari": "Bu yanıt bilgi amaçlıdır ve hukuki tavsiye niteliği taşımaz."
}
```

**Response — Rate Limit (429)**

```json
{
  "error": "Rate limit exceeded",
  "detail": "20 per 1 minute",
  "retry_after": 34
}
```

**Response — Servis Hatası (503)**

```json
{
  "error": "upstream_unavailable",
  "detail": "Groq API timeout",
  "retry_after": 30
}
```

### 2.4 Endpoint: GET /search

_Direkt kanun maddesi veya dava numarasıyla arama. LLM çağrısı yapılmaz, sadece Qdrant'ta metadata filtreli arama yapılır._

**Request**

```
GET /search?q=Madde+17&tur=kanun

Parametreler:
  q      string   Zorunlu. Madde no veya dava no. Örn: "Madde 17", "2023/1234"
  tur    string   Opsiyonel. kanun | yargitay_karari (filtre, default: hepsi)
  limit  integer  Opsiyonel. Max sonuç sayısı, default: 10
```

**Response — Başarılı (200)**

```json
{
  "sonuclar": [
    {
      "kaynak_turu": "kanun",
      "baslik": "4857 Sayılı İş Kanunu — Madde 17",
      "metin": "string",
      "skor": 0.95
    }
  ],
  "toplam": 3
}
```

### 2.5 Endpoint: GET /health

_Render.com cron job ve deployment check için. Qdrant ve Groq API erişimini kontrol eder._

```json
// Response (200)
{
  "status": "ok",
  "qdrant": "connected",
  "groq": "reachable",
  "version": "1.0.0"
}

// Response (503)
{
  "status": "degraded",
  "qdrant": "unreachable",
  "groq": "connected"
}
```

### 2.6 Pydantic Modelleri

```python
# schemas.py

class AskRequest(BaseModel):
    soru: str = Field(..., min_length=10, max_length=1000)
    max_kaynak: int = Field(default=5, ge=1, le=10)

class KaynakItem(BaseModel):
    kaynak_turu: str
    baslik: str
    metin_ozet: str
    skor: float

class AskResponse(BaseModel):
    yanit: str
    kaynaklar: list[KaynakItem]
    uyari: str = "Bu yanıt bilgi amaçlıdır ve hukuki tavsiye niteliği taşımaz."
```

---

## 3. RAG Pipeline Akış Dokümantasyonu

### 3.1 Genel Akış

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

### 3.2 Adım Adım Detay

**Adım 1 — Query Rewriting**

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

**Adım 2 — Retrieval**

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

**Adım 3 — Skor Filtresi**

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

**Adım 4 — Yanıt Üretme**

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

### 3.3 Hata Yönetimi

| Senaryo | Davranış | HTTP Yanıt |
|---------|----------|------------|
| Groq API timeout (>10s) | 503 döner, retry önerilir | `503 + retry_after` |
| Qdrant bağlantı hatası | 503 döner | `503 + retry_after` |
| Hiç chunk bulunamadı (skor < eşik) | En yüksek 1 chunk ile devam et | `200` (düşük güven uyarısı ile) |
| Groq rate limit (429) | Exponential backoff, 3 deneme | `200` (gecikmeli) veya `503` |
| Soru çok kısa (<10 karakter) | Validasyon hatası | `422` |

### 3.4 Proje Dizin Yapısı

```
backend/
├── main.py                  # FastAPI app, rate limiter, endpoint'ler
├── schemas.py               # Pydantic modelleri
├── config.py                # Environment variables
├── requirements.txt
├── Dockerfile
├── .env.example
├── rag/
│   ├── pipeline.py          # Adımları birleştiren ana fonksiyon
│   ├── query_rewriter.py    # Adım 1
│   ├── retriever.py         # Adım 2 + 3
│   └── generator.py         # Adım 4
├── data/
│   ├── raw/                 # Ham scraping çıktıları
│   └── processed/           # Chunk JSON'ları (Qdrant yüklenmeden önce)
└── scripts/
    ├── chunk_kanun.py        # Kanun metni chunking
    ├── chunk_yargitay.py     # Yargıtay kararı chunking
    └── load_qdrant.py        # Qdrant'a yükleme
```

### 3.5 Groq API Kullanım Özeti

| Endpoint | Model | Maks Token | Tahmini Süre |
|----------|-------|------------|--------------|
| Query Rewriting | `llama-3.1-8b-instant` | 200 | < 1 saniye |
| Yanıt Üretme | `llama-3.3-70b-versatile` | 1000 | 2-4 saniye |
| **Toplam p95 yanıt süresi** | — | — | **< 10 saniye (hedef)** |

> **Groq Free Tier:** Dakikada 30 istek, günde 14.400 istek. Geliştirme sırasında query rewriting adımı için `MOCK_MODE=true` kullanılması önerilir — böylece 70B model harcaması azalır.
