# API Dokumantasyonu

```
Base URL (dev):  http://localhost:8000
Base URL (prod): https://turk-hukuk-api.onrender.com
```

FastAPI otomatik olarak `/docs` (Swagger UI) ve `/redoc` uretir.

Response formatlari:

- Varsayilan format JSON'dir.
- `POST /ask/stream` `text/event-stream` doner.
- `GET /chat/conversations/{id}/export` `application/pdf` doner.
- `POST /templates/{id}/generate` `application/pdf` doner.

Kimlik dogrulama notlari:

- Kullanici endpoint'lerinde `Authorization: Bearer <access_token>` gerekir.
- Misafir endpoint'leri acik gibi gorunse de fiilen `guest_session_id` cookie'si ister.
- `POST /auth/login` ve `POST /auth/refresh` refresh token'i response body yerine HttpOnly cookie olarak yazar.
- `POST /auth/logout` cookie veya body'den gelen refresh token'i iptal eder.

---

## Endpoint Listesi

| Method | Path | Auth | Aciklama |
|--------|------|------|----------|
| POST | `/ask` | Opsiyonel | RAG pipeline (rate: 20/min) |
| POST | `/ask/stream` | Opsiyonel | SSE streaming yanit (rate: 20/min) |
| GET | `/search` | - | Kanun/karar arama, LLM cagrisi yapmaz |
| GET | `/health` | - | Servis saglik ozeti |
| POST | `/auth/register` | - | Kayit (rate: 5/min) |
| POST | `/auth/login` | - | Giris, access token + refresh cookie (rate: 5/min) |
| POST | `/auth/refresh` | - | Access token yenile, refresh rotation |
| POST | `/auth/logout` | - | Refresh token iptal |
| GET | `/auth/profile` | Zorunlu | Profil bilgilerini getir |
| PUT | `/auth/profile` | Zorunlu | Email / sifre guncelle |
| DELETE | `/auth/account` | Zorunlu | Hesabi pasiflestir, tokenlari iptal et |
| GET | `/chat/conversations` | Zorunlu | Kullanici sohbet listesi |
| GET | `/chat/history/{id}` | Zorunlu | Kullanici sohbet mesajlari |
| DELETE | `/chat/conversations/{id}` | Zorunlu | Sohbeti sil |
| PATCH | `/chat/conversations/{id}/title` | Zorunlu | Sohbet basligini yeniden adlandir |
| GET | `/chat/conversations/{id}/export` | Zorunlu | Sohbeti PDF olarak disa aktar |
| POST | `/chat/conversations/{id}/share` | Zorunlu | Paylasim linki olustur |
| DELETE | `/chat/conversations/{id}/share` | Zorunlu | Paylasimi kaldir |
| GET | `/chat/shared/{share_token}` | - | Paylasilan sohbeti salt okunur getir |
| GET | `/chat/guest/conversations` | Guest cookie | Misafir sohbet listesi |
| GET | `/chat/guest/history/{id}` | Guest cookie | Misafir mesajlari |
| DELETE | `/chat/guest/conversations/{id}` | Guest cookie | Misafir sohbeti sil |
| POST | `/feedback` | Kullanici veya guest cookie | Asistan mesajina `puan: 1/-1` gonder |
| POST | `/documents/analyze` | Opsiyonel | PDF yukle + analiz et (rate: 10/min) |
| POST | `/documents/compare` | Opsiyonel | Iki PDF karsilastir (rate: 5/min) |
| GET | `/templates` | - | Taslak listesi (`?language=tr|en`) |
| POST | `/templates/{id}/generate` | - | PDF taslagi indir (rate: 20/min) |
| GET | `/forum/threads` | - | Forum basliklarini listele |
| POST | `/forum/threads` | Zorunlu | Yeni forum basligi olustur |
| GET | `/forum/threads/{id}` | - | Forum basligi + yanit detayini getir |
| PUT | `/forum/threads/{id}` | Zorunlu | Kendi forum basligini guncelle |
| DELETE | `/forum/threads/{id}` | Zorunlu | Kendi basligini sil; `LAWYER`/`ADMIN` moderasyon yapabilir |
| PATCH | `/forum/threads/{id}/lock` | `LAWYER`/`ADMIN` | Basligi kilitle / ac |
| POST | `/forum/threads/{id}/replies` | Zorunlu | Basliga yanit yaz |
| PUT | `/forum/replies/{id}` | Zorunlu | Kendi yanitini guncelle |
| DELETE | `/forum/replies/{id}` | Zorunlu | Kendi yanitini sil; `LAWYER`/`ADMIN` moderasyon yapabilir |
| PATCH | `/forum/replies/{id}/verify` | `LAWYER`/`ADMIN` | Yaniti dogrulanmis olarak isaretle |
| POST | `/forum/threads/{id}/vote` | Zorunlu | Basliga oy ver (`value`: 1 / -1) |
| POST | `/forum/replies/{id}/vote` | Zorunlu | Yanita oy ver (`value`: 1 / -1) |
| GET | `/admin/stats` | ADMIN | Genel istatistikler |
| GET | `/admin/stats/categories` | ADMIN | Kategori dagilimi |
| GET | `/admin/stats/feedback` | ADMIN | Feedback ozeti |
| GET | `/admin/stats/daily` | ADMIN | Gunluk aktivite (son N gun) |
| GET | `/admin/users` | ADMIN | Kullanici listesi |
| PATCH | `/admin/users/{id}/role` | ADMIN | Kullanici rolu guncelle |
| PATCH | `/admin/users/{id}/status` | ADMIN | Kullanici aktif/pasif durumu degistir |
| GET | `/admin/weak-queries` | ADMIN | Zayif sorgu listesi |

Forum endpoint'lerinin public response alanlarinda kullanici email'i donulmez. Thread ve reply response'larinda bunun yerine anonim `display_name` kullanilir.

---

## Rate Limiting

| Endpoint | Limit |
|----------|-------|
| `POST /ask` | 20 istek / dakika / IP |
| `POST /ask/stream` | 20 istek / dakika / IP |
| `POST /auth/register` | 5 istek / dakika / IP |
| `POST /auth/login` | 5 istek / dakika / IP |
| `POST /documents/analyze` | 10 istek / dakika / IP |
| `POST /documents/compare` | 5 istek / dakika / IP |
| `POST /templates/{id}/generate` | 20 istek / dakika / IP |

Rate limit asiminda response:

```json
{
  "error": "Rate limit exceeded",
  "detail": "20 per 1 minute",
  "retry_after": 60
}
```

---

## Genel Hata Kodlari

| HTTP Kodu | Durum | Aciklama |
|-----------|-------|----------|
| `200` | OK | Basarili yanit |
| `201` | Created | Kaynak olusturuldu |
| `204` | No Content | Govdesiz basarili islem |
| `400` | Bad Request | Eksik/gecersiz istek |
| `401` | Unauthorized | Token veya guest session eksik/gecersiz |
| `403` | Forbidden | Yetki var ama hedefe erisim izni yok |
| `404` | Not Found | Kaynak bulunamadi |
| `409` | Conflict | Kayitli email gibi cakisma |
| `422` | Unprocessable Entity | FastAPI / Pydantic validasyon hatasi |
| `429` | Too Many Requests | Rate limit asildi |
| `500` | Internal Server Error | Beklenmedik sunucu hatasi |
| `503` | Service Unavailable | Upstream servis kullanilamiyor |

`STRICT_UPSTREAMS=true` modunda `/ask` ve `/ask/stream` upstream kesintilerinde `503` dondurebilir.

---

## POST /ask

Ana endpoint. Hukuki soruyu alir, RAG pipeline'i calistirir, chat history'ye kaydeder ve kaynak atifli yanit doner.

Request body:

```json
{
  "soru": "string",
  "max_kaynak": 5,
  "language": "tr",
  "conversation_id": "uuid",
  "guest_session_id": "uuid"
}
```

Alanlar:

- `soru`: zorunlu, `10-1000` karakter.
- `max_kaynak`: opsiyonel, varsayilan `5`, aralik `1-10`.
- `language`: opsiyonel, `tr` veya `en`.
- `conversation_id`: opsiyonel, mevcut sohbeti devam ettirmek icin.
- `guest_session_id`: opsiyonel, cookie yoksa misafir oturumunu devam ettirmek icin.

Response `200`:

```json
{
  "yanit": "string",
  "kaynaklar": [
    {
      "kaynak_turu": "kanun",
      "baslik": "4857 Sayili Is Kanunu - 17",
      "metin_ozet": "string",
      "metin": "string",
      "skor": 0.87,
      "url": "https://www.mevzuat.gov.tr/..."
    }
  ],
  "conversation_id": "uuid",
  "guest_session_id": "uuid|null",
  "kategori": "Is Hukuku",
  "message_id": "uuid",
  "uyari": "string"
}
```

Response `503`:

```json
{
  "detail": {
    "error": "upstream_unavailable",
    "detail": "Harici servis(ler)e su an erisilemiyor.",
    "retry_after": 30
  }
}
```

Notlar:

- Auth'suz isteklerde `guest_session_id` cookie'si set edilir.
- Dusuk skorlu veya kaynaksiz sorgular admin paneli icin `weak_queries` tablosuna loglanabilir.

---

## POST /ask/stream

`/ask` ile ayni request body'yi alir, yaniti SSE olarak akar.

Response content type:

```text
text/event-stream
```

SSE event tipleri:

1. `meta`

```json
{
  "type": "meta",
  "kaynaklar": [],
  "kategori": "Is Hukuku",
  "conversation_id": "uuid",
  "guest_session_id": "uuid|null"
}
```

2. `token`

```json
{ "type": "token", "text": "Madde" }
```

3. `error`

```json
{ "type": "error", "detail": "string" }
```

4. `done`

```json
{
  "type": "done",
  "message_id": "uuid|null",
  "uyari": "string"
}
```

Notlar:

- `done.message_id` feedback icin kullanilir.
- Guest akislarda uygun durumda `guest_session_id` cookie'si set edilir.
- Streaming baslamadan onceki upstream hatalari normal HTTP `503` olarak donebilir.

---

## GET /search

LLM cagrisi yapmaz. Retriever katmanini kullanarak ilgili kanun / karar parcaciklarini getirir.

Ornek:

```text
GET /search?q=Madde+17&tur=kanun&limit=10
```

Query parametreleri:

- `q`: zorunlu.
- `tur`: opsiyonel, `kanun` veya `yargitay_karari`.
- `limit`: opsiyonel, varsayilan `10`, aralik `1-50`.

Response `200`:

```json
{
  "sonuclar": [
    {
      "kaynak_turu": "kanun",
      "baslik": "4857 Sayili Is Kanunu - 17",
      "metin_ozet": "string",
      "metin": "string",
      "skor": 0.95,
      "url": "https://www.mevzuat.gov.tr/..."
    }
  ],
  "toplam": 1
}
```

---

## GET /health

Qdrant ve Groq baglanti durumunu ozetler. Endpoint kendi basina `503` donmez; bozulma durumunu response body icinde `status: "degraded"` ile ifade eder.

Olasu `qdrant` degerleri:

- `connected`
- `mock`
- `local_fallback`
- `not_configured`
- `unreachable`

Olasu `groq` degerleri:

- `reachable`
- `mock`
- `not_configured`

Response ornegi:

```json
{
  "status": "ok",
  "qdrant": "connected",
  "groq": "reachable",
  "version": "1.0.0"
}
```

Degraded ornegi:

```json
{
  "status": "degraded",
  "qdrant": "local_fallback",
  "groq": "not_configured",
  "version": "1.0.0"
}
```

---

## Auth Notlari

`POST /auth/login` response modeli:

```json
{
  "access_token": "jwt",
  "refresh_token": "",
  "token_type": "bearer",
  "role": "user"
}
```

Notlar:

- `refresh_token` body'de bilerek bos string doner.
- Gercek refresh token HttpOnly `refresh_token` cookie'sine yazilir.
- `POST /auth/refresh` cookie'yi tercih eder, body fallback'i geriye donuk uyumluluk icin destekler.

---

## PDF ve Taslak Endpoint'leri

### POST /documents/analyze

`multipart/form-data` alanlari:

- `dosya`: zorunlu PDF
- `soru`: opsiyonel
- `language`: opsiyonel, `tr|en`
- `conversation_id`: opsiyonel
- `guest_session_id`: opsiyonel

Response `200`:

```json
{
  "yanit": "string",
  "belge_ozeti": "string",
  "kaynaklar": [],
  "kategori": "Genel Hukuk",
  "conversation_id": "uuid",
  "guest_session_id": "uuid|null",
  "message_id": "uuid|null",
  "uyari": "string"
}
```

### POST /documents/compare

`multipart/form-data` alanlari:

- `dosya1`: zorunlu PDF
- `dosya2`: zorunlu PDF
- `soru`: opsiyonel
- `language`: opsiyonel, `tr|en`

Response `200`:

```json
{
  "yanit": "string",
  "belge1_ozet": "string",
  "belge2_ozet": "string",
  "kaynaklar": [],
  "kategori": "Genel Hukuk",
  "uyari": "string"
}
```

### POST /templates/{id}/generate

JSON request body:

```json
{
  "alanlar": {
    "ad_soyad": "Ornek Kisi"
  },
  "language": "tr"
}
```

Response:

- `application/pdf`

---

## Pydantic Modelleri

Asil kaynak `backend/schemas.py` dosyasidir. Dokumanda ozetlenen temel modeller:

```python
class AskRequest(BaseModel):
    soru: str
    max_kaynak: int = 5
    language: str = "tr"
    conversation_id: str | None = None
    guest_session_id: str | None = None

class AskResponse(BaseModel):
    yanit: str
    kaynaklar: list[KaynakItem]
    conversation_id: str
    guest_session_id: str | None = None
    kategori: str
    message_id: str | None = None
    uyari: str

class DokumanAnalizCevap(BaseModel):
    yanit: str
    belge_ozeti: str
    kaynaklar: list
    kategori: str
    conversation_id: str | None = None
    guest_session_id: str | None = None
    message_id: str | None = None
    uyari: str

class FeedbackGonder(BaseModel):
    message_id: str
    puan: int  # 1 veya -1
    guest_session_id: str | None = None
```
