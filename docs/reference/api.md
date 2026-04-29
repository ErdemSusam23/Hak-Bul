# API Dokümantasyonu

Base URL (dev): `http://localhost:8000`

FastAPI ayrıca:
- `GET /docs`
- `GET /redoc`

## Genel Notlar

- Varsayılan response biçimi JSON'dır.
- `POST /ask/stream` `text/event-stream` döner.
- `GET /chat/conversations/{id}/export` `application/pdf` döner.
- `POST /templates/{id}/generate` `application/pdf` döner.
- Access token `Authorization: Bearer <token>` başlığıyla taşınır.
- Refresh token body yerine HttpOnly `refresh_token` cookie'sinde tutulur.
- Guest akışlarında HttpOnly `guest_session_id` cookie'si kullanılır.

## Endpoint Özeti

| Method | Path | Auth | Açıklama |
|---|---|---|---|
| POST | `/ask` | Opsiyonel | RAG pipeline, guest cookie set edebilir |
| POST | `/ask/stream` | Opsiyonel | SSE streaming yanıt |
| GET | `/search` | - | Kanun / karar araması |
| GET | `/health` | - | Qdrant ve Groq durum özeti |
| POST | `/auth/register` | - | Kayıt |
| POST | `/auth/login` | - | Giriş, access token + refresh cookie |
| POST | `/auth/refresh` | - | Access token yenileme |
| POST | `/auth/logout` | - | Refresh token iptali |
| GET | `/auth/profile` | Zorunlu | Profil getir |
| PUT | `/auth/profile` | Zorunlu | Email / şifre güncelle |
| DELETE | `/auth/account` | Zorunlu | Hesabı pasifleştir ve tokenları iptal et |
| GET | `/chat/conversations` | Zorunlu | Kullanıcı sohbet listesi |
| GET | `/chat/history/{id}` | Zorunlu | Kullanıcı sohbet mesajları |
| PATCH | `/chat/conversations/{id}/title` | Zorunlu | Sohbet başlığı güncelle |
| DELETE | `/chat/conversations/{id}` | Zorunlu | Sohbeti soft-delete et |
| GET | `/chat/conversations/{id}/export` | Zorunlu | Sohbet PDF export |
| POST | `/chat/conversations/{id}/share` | Zorunlu | Paylaşım linki oluştur |
| DELETE | `/chat/conversations/{id}/share` | Zorunlu | Paylaşımı kapat |
| GET | `/chat/shared/{share_token}` | - | Paylaşılan sohbeti getir |
| GET | `/chat/guest/conversations` | Guest cookie | Misafir sohbet listesi |
| GET | `/chat/guest/history/{id}` | Guest cookie | Misafir sohbet mesajları |
| DELETE | `/chat/guest/conversations/{id}` | Guest cookie | Misafir sohbeti sil |
| POST | `/feedback` | User veya guest cookie | Asistan mesajına puan ver |
| POST | `/documents/analyze` | Opsiyonel | PDF analiz |
| POST | `/documents/compare` | Opsiyonel | İki PDF karşılaştır |
| GET | `/templates` | - | Taslak listesi |
| POST | `/templates/{id}/generate` | - | Taslaktan PDF üret |
| GET | `/forum/threads` | - | Forum başlıklarını listele |
| POST | `/forum/threads` | Zorunlu | Başlık oluştur |
| GET | `/forum/threads/{id}` | - | Başlık ve yanıt detayları |
| PUT | `/forum/threads/{id}` | Zorunlu | Kendi başlığını güncelle |
| DELETE | `/forum/threads/{id}` | Zorunlu | Kendi başlığını sil, moderasyon destekli |
| PATCH | `/forum/threads/{id}/lock` | `LAWYER`/`ADMIN` | Başlığı kilitle / aç |
| POST | `/forum/threads/{id}/replies` | Zorunlu | Yanıt oluştur |
| PUT | `/forum/replies/{id}` | Zorunlu | Kendi yanıtını güncelle |
| DELETE | `/forum/replies/{id}` | Zorunlu | Kendi yanıtını sil, moderasyon destekli |
| PATCH | `/forum/replies/{id}/verify` | `LAWYER`/`ADMIN` | Yanıt doğrula |
| POST | `/forum/threads/{id}/vote` | Zorunlu | Başlığa oy ver |
| POST | `/forum/replies/{id}/vote` | Zorunlu | Yanıta oy ver |
| GET | `/admin/stats` | ADMIN | Genel istatistikler |
| GET | `/admin/stats/categories` | ADMIN | Kategori dağılımı |
| GET | `/admin/stats/feedback` | ADMIN | Feedback özeti |
| GET | `/admin/stats/daily` | ADMIN | Günlük aktivite |
| GET | `/admin/users` | ADMIN | Kullanıcı listesi |
| PATCH | `/admin/users/{id}/role` | ADMIN | Rol güncelle |
| PATCH | `/admin/users/{id}/status` | ADMIN | Aktif / pasif güncelle |
| GET | `/admin/weak-queries` | ADMIN | Zayıf sorguları listele |

## Rate Limit

| Endpoint | Limit |
|---|---|
| `POST /ask` | 20/dakika |
| `POST /ask/stream` | 20/dakika |
| `POST /auth/register` | 5/dakika |
| `POST /auth/login` | 5/dakika |
| `POST /documents/analyze` | 10/dakika |
| `POST /documents/compare` | 5/dakika |
| `POST /templates/{id}/generate` | 20/dakika |

Rate limit response:

```json
{
  "error": "Rate limit exceeded",
  "detail": "20 per 1 minute",
  "retry_after": 60
}
```

## `POST /ask`

Request:

```json
{
  "soru": "Kıdem tazminatı hangi şartlarda alınır?",
  "max_kaynak": 5,
  "language": "tr",
  "conversation_id": "uuid",
  "guest_session_id": "uuid"
}
```

Notlar:
- `soru`: 10-1000 karakter.
- `max_kaynak`: 1-10, varsayılan `5`.
- `language`: `tr` veya `en`.
- `guest_session_id`: cookie yoksa guest oturumunu sürdürmek için kullanılabilir.

Başarılı response:

```json
{
  "yanit": "...",
  "kaynaklar": [
    {
      "kaynak_turu": "kanun",
      "baslik": "4857 Sayılı İş Kanunu - Madde 17",
      "metin_ozet": "...",
      "skor": 0.87,
      "url": "https://www.mevzuat.gov.tr/..."
    }
  ],
  "conversation_id": "uuid",
  "guest_session_id": "uuid",
  "kategori": "İş Hukuku",
  "message_id": "uuid",
  "uyari": "..."
}
```

`STRICT_UPSTREAMS=true` ve upstream hazır değilse:

```json
{
  "detail": {
    "error": "upstream_unavailable",
    "detail": "Harici servis(ler)e su an erisilemiyor.",
    "retry_after": 30
  }
}
```

## `POST /ask/stream`

Aynı request body'yi alır. Event yapısı:

1. `meta`
2. `token`
3. `done`

Hata halinde `error` emit edilir ve stream kapanır.

Örnek `meta`:

```json
{
  "type": "meta",
  "kaynaklar": [],
  "kategori": "İş Hukuku",
  "conversation_id": "uuid",
  "guest_session_id": "uuid"
}
```

Örnek `token`:

```json
{ "type": "token", "text": "Madde" }
```

Örnek `done`:

```json
{
  "type": "done",
  "message_id": "uuid",
  "uyari": "..."
}
```

## `GET /health`

Response:

```json
{
  "status": "ok",
  "qdrant": "connected",
  "groq": "reachable",
  "version": "1.0.0"
}
```

Olası `qdrant` değerleri:
- `connected`
- `mock`
- `local_fallback`
- `not_configured`
- `unreachable`

Olası `groq` değerleri:
- `reachable`
- `mock`
- `not_configured`

## Auth Notları

`POST /auth/login` ve `POST /auth/refresh` response modeli:

```json
{
  "access_token": "jwt",
  "refresh_token": "",
  "token_type": "bearer",
  "role": "user"
}
```

Notlar:
- `refresh_token` body'de bilinçli olarak boş string döner.
- Gerçek refresh token HttpOnly cookie'ye yazılır.
- `/auth/refresh` cookie-first, body-fallback davranışı kullanır.

## PDF Endpoint'leri

### `POST /documents/analyze`

`multipart/form-data` alanları:
- `dosya` zorunlu PDF
- `soru` opsiyonel
- `language` opsiyonel (`tr|en`)
- `conversation_id` opsiyonel
- `guest_session_id` opsiyonel

Response:

```json
{
  "yanit": "...",
  "belge_ozeti": "...",
  "kaynaklar": [],
  "kategori": "Genel Hukuk",
  "conversation_id": "uuid",
  "guest_session_id": "uuid",
  "message_id": "uuid",
  "uyari": "..."
}
```

### `POST /documents/compare`

`multipart/form-data` alanları:
- `dosya1`
- `dosya2`
- `soru`
- `language`

Response:

```json
{
  "yanit": "...",
  "belge1_ozet": "...",
  "belge2_ozet": "...",
  "kaynaklar": [],
  "kategori": "Genel Hukuk",
  "uyari": "..."
}
```

## Templates

`GET /templates?language=tr|en` şu an 8 taslağı döner.

`POST /templates/{id}/generate` request:

```json
{
  "alanlar": {
    "ad_soyad": "Örnek Kişi"
  },
  "language": "tr"
}
```

## Admin Query Parametreleri

- `GET /admin/stats?gun=7`
- `GET /admin/stats/categories?gun=7`
- `GET /admin/stats/feedback?gun=7`
- `GET /admin/stats/daily?gun=7`
- `GET /admin/users?limit=50&offset=0&q=&rol=user&aktif=true`
- `GET /admin/weak-queries?limit=100&offset=0`
