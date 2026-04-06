# Minimum Maliyetli Production Checklist (Vercel + Render)

Bu rehber bitirme projesi için düşük maliyetli production çıkışı hedefler.

## 1) Hedef Mimari

- Frontend: Vercel Hobby (`app.hakbul.com`)
- Backend: Render Web Service (`api.hakbul.com`)
- Veritabanı: Render Postgres (free/hobby)
- Ortam: Tek production ortamı (staging yok)

## 2) Zorunlu Environment Değerleri

Backend production env:

```env
APP_VERSION=1.0.0
CORS_ORIGINS=https://app.hakbul.com

DATABASE_URL=postgresql+psycopg://...
JWT_SECRET_KEY=<strong-random-secret>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=14

COOKIE_SECURE=true
COOKIE_SAMESITE=none

GROQ_API_KEY=...
QDRANT_URL=https://...
QDRANT_API_KEY=...
QDRANT_COLLECTION=hukuk_chunks

EMBEDDING_MODE=remote
EMBEDDING_SERVICE_URL=<render-embedding-service-url>
EMBEDDING_SERVICE_API_KEY=...
EMBEDDING_TIMEOUT_MS=2000

MOCK_RETRIEVAL=false
MOCK_LLM=false
STRICT_UPSTREAMS=true
ALLOW_LOCAL_RETRIEVAL_FALLBACK=false
```

Frontend production env/build arg:

```env
VITE_API_URL=https://api.hakbul.com
VITE_MOCK_MODE=false
```

## 3) Deploy Sırası

1. Production DB snapshot/backup al.
2. Backend deploy et.
3. Backend ayakta kalkınca migration uygula: `alembic upgrade head`.
4. `GET /health` kontrol et.
5. Frontend deploy et.
6. Domain DNS kontrollerini doğrula (`app` ve `api`).

## 4) Go-Live Smoke Test

- `GET https://api.hakbul.com/health` -> `status=ok`.
- Auth: register/login/refresh/logout.
- Chat: `/ask` ve `/ask/stream`.
- Feedback: `/feedback`.
- PDF akışları: `/documents/analyze`, `/documents/compare`.
- Admin: `/admin/users` ve `/admin/weak-queries` (admin token ile).

## 5) Hard-Fail Doğrulaması

Amaç: Dış servis yoksa sessiz fallback yerine 503 dönmek.

1. Geçici olarak `QDRANT_URL` veya `GROQ_API_KEY` boz.
2. `/ask` isteği gönder.
3. Beklenen: `503` + `error=upstream_unavailable`.
4. Secret'i geri al ve yeniden deploy et.

## 6) Rollback

1. Render'da bir önceki başarılı backend deploy'una dön.
2. Vercel'de bir önceki başarılı deployment'ı promote et.
3. Gerekirse DB snapshot'tan geri dön.
4. `health` + smoke testleri tekrar çalıştır.
