# API Dokümantasyonu

`backend-docs.md`'den bölündü — v2.0`

```
Base URL (dev):  http://localhost:8000
Base URL (prod): https://turk-hukuk-api.onrender.com
```

Tüm yanıtlar JSON formatındadır. FastAPI otomatik `/docs` (Swagger UI) ve `/redoc` üretir.

---

## Endpoint Listesi

| Method | Path | Auth | Açıklama |
|--------|------|------|----------|
| POST | `/ask` | Opsiyonel | RAG pipeline (rate: 20/min) |
| GET | `/search` | — | Kanun/karar keyword arama |
| GET | `/health` | — | Servis durumu |
| POST | `/auth/register` | — | Kayıt |
| POST | `/auth/login` | — | Giriş → token çifti |
| POST | `/auth/refresh` | — | Access token yenileme |
| POST | `/auth/logout` | — | Refresh token iptal |
| GET | `/chat/conversations` | Zorunlu | Auth kullanıcı sohbet listesi |
| GET | `/chat/history/{id}` | Zorunlu | Auth sohbet mesajları |
| GET | `/chat/guest/conversations` | — | Misafir sohbet listesi |
| GET | `/chat/guest/history/{id}` | — | Misafir mesajları |
| POST | `/feedback` | Opsiyonel | 👍/👎 gönder (`puan`: 1 veya -1) |
| POST | `/documents/analyze` | Opsiyonel | PDF yükle + analiz et |
| GET | `/templates` | — | Taslak listesi |
| POST | `/templates/{id}/generate` | — | PDF taslağı indir |
| GET | `/admin/stats` | ADMIN | Genel istatistikler |
| GET | `/admin/stats/categories` | ADMIN | Kategori dağılımı |
| GET | `/admin/stats/feedback` | ADMIN | Feedback özeti |
| GET | `/admin/stats/daily` | ADMIN | Günlük aktivite (son N gün) |

---

## Rate Limiting

| Parametre | Değer |
|-----------|-------|
| Limit | 20 istek / dakika / IP |
| Scope | Sadece `POST /ask` endpoint'i |
| Aşım yanıtı | HTTP 429 Too Many Requests |
| Reset süresi | 60 saniye (sabit pencere) |
| Prod'da kalıcı depolama | Yok — server restart'ta sıfırlanır (MVP için yeterli) |

---

## Genel Hata Kodları

| HTTP Kodu | Durum | Açıklama |
|-----------|-------|----------|
| `200` | OK | Başarılı yanıt |
| `400` | Bad Request | Eksik/geçersiz istek gövdesi |
| `422` | Unprocessable Entity | FastAPI validasyon hatası |
| `429` | Too Many Requests | Rate limit aşıldı |
| `503` | Service Unavailable | Groq API veya Qdrant erişilemiyor |
| `500` | Internal Server Error | Beklenmedik sunucu hatası |

---

## POST /ask

Ana endpoint. Kullanıcının hukuki sorusunu alır, RAG pipeline'ı çalıştırır, kaynak atıflı yanıt döner.

**Request**

```json
{
  "soru": "string",           // Zorunlu. Min 10, max 1000 karakter.
  "max_kaynak": 5,            // Opsiyonel. Default: 5, max: 10
  "conversation_id": "uuid",  // Opsiyonel. Mevcut sohbete devam için.
  "guest_session_id": "uuid"  // Opsiyonel. Misafir oturumu için.
}
```

**Response — 200**

```json
{
  "yanit": "string",
  "kaynaklar": [
    {
      "kaynak_turu": "kanun",
      "baslik": "4857 Sayılı İş Kanunu — Madde 17",
      "metin_ozet": "string",
      "skor": 0.87,
      "url": "https://www.mevzuat.gov.tr/..."
    }
  ],
  "conversation_id": "uuid",
  "guest_session_id": "uuid|null",
  "kategori": "İş Hukuku",
  "message_id": "uuid",
  "uyari": "Bu yanit bilgi amaclidir ve hukuki tavsiye niteligi tasimaz."
}
```

**Response — 429**

```json
{
  "error": "Rate limit exceeded",
  "detail": "20 per 1 minute",
  "retry_after": 34
}
```

**Response — 503**

```json
{
  "error": "upstream_unavailable",
  "detail": "Groq API timeout",
  "retry_after": 30
}
```

---

## GET /search

Direkt kanun maddesi veya dava numarasıyla arama. LLM çağrısı yapılmaz, sadece Qdrant'ta metadata filtreli arama yapılır.

```
GET /search?q=Madde+17&tur=kanun

Parametreler:
  q      string   Zorunlu. Madde no veya dava no. Örn: "Madde 17", "2023/1234"
  tur    string   Opsiyonel. kanun | yargitay_karari (filtre, default: hepsi)
  limit  integer  Opsiyonel. Max sonuç sayısı, default: 10
```

**Response — 200**

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

---

## GET /health

Render.com cron job ve deployment check için. Qdrant ve Groq API erişimini kontrol eder.

```json
// 200
{ "status": "ok", "qdrant": "connected", "groq": "reachable", "version": "1.0.0" }

// 503
{ "status": "degraded", "qdrant": "unreachable", "groq": "connected" }
```

---

## Pydantic Modelleri

```python
# schemas.py

class AskRequest(BaseModel):
    soru: str = Field(..., min_length=10, max_length=1000)
    max_kaynak: int = Field(default=5, ge=1, le=10)
    conversation_id: str | None = Field(default=None, min_length=36, max_length=36)
    guest_session_id: str | None = Field(default=None, min_length=36, max_length=36)

class KaynakItem(BaseModel):
    kaynak_turu: str
    baslik: str
    metin_ozet: str
    skor: float
    url: str | None = None

class AskResponse(BaseModel):
    yanit: str
    kaynaklar: list[KaynakItem]
    conversation_id: str
    guest_session_id: str | None = None
    kategori: str = "Genel Hukuk"
    message_id: str | None = None
    uyari: str = "..."

class FeedbackGonder(BaseModel):
    message_id: str = Field(..., min_length=36, max_length=36)
    puan: int        # 1 veya -1 (validator ile doğrulanır)
    guest_session_id: str | None = None
```
