# Hak-Bul Production Go-Live Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hak-Bul uygulamasini minimum maliyetli production mimaride (Vercel + Render + Render Postgres + Qdrant Cloud + Groq) guvenli ve dogrulanmis sekilde canliya almak.

**Architecture:** Frontend Vercel Hobby ortaminda `app.hakbul.com`, backend Render Web Service ortaminda `api.hakbul.com` calisir. Backend Render Postgres'e baglanir; retrieval icin Qdrant Cloud, yanit uretimi icin Groq kullanilir. Local fallback ve mock modlari production'da kapatilir; upstream erisilemezse hard-fail (503) politikasi uygulanir.

**Tech Stack:** FastAPI, React/Vite, Docker image deploy, Render, Vercel, PostgreSQL, Qdrant Cloud, Groq API

---

### Task 1: Production Kararlari ve Hesap Hazirligi

**Files:**
- Reference: `docs/guides/production-min-cost-checklist.md`
- Reference: `docs/guides/env-setup.md`

- [ ] **Step 1: Domain ve servis hedeflerini kilitle**

Karar:
- Frontend: `app.hakbul.com` (Vercel)
- Backend: `api.hakbul.com` (Render)
- Tek ortam: production (staging yok)

- [ ] **Step 2: Dis servis hesaplarini dogrula**

Gerekli:
- Render hesabi
- Vercel hesabi
- Qdrant Cloud cluster + API key
- Groq API key

- [ ] **Step 3: Mevcut veritabaninin yedek planini netlestir**

Minimum:
- Render Postgres snapshot alma yontemi
- Rollback'te onceki snapshot'a donus adimlari

### Task 2: Backend Production Environment Kurulumu (Render)

**Files:**
- Reference: `docs/guides/production-min-cost-checklist.md`
- Reference: `backend/.env.example`

- [ ] **Step 1: Render backend environment variable'larini gir**

Zorunlu:
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

- [ ] **Step 2: JWT secret uret ve yerlestir**

Komut:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

- [ ] **Step 3: Backend deploy tetikle**

Beklenen:
- Render build + start basarili
- Servis ayakta

### Task 3: Backend Migration ve Health Dogrulamasi

**Files:**
- Reference: `backend/alembic/versions/`

- [ ] **Step 1: Migrationlari production DB'ye uygula**

Komut:
```bash
alembic upgrade head
```

Beklenen:
- Son migration `20260326_0006` dahil tum migrationlar uygulanmis olmali.

- [ ] **Step 2: Health endpoint kontrolu yap**

Kontrol:
```bash
GET https://api.hakbul.com/health
```

Beklenen:
- `status=ok`

### Task 4: Frontend Production Environment ve Deploy (Vercel)

**Files:**
- Reference: `docs/guides/production-min-cost-checklist.md`
- Reference: `frontend/.env.example`

- [ ] **Step 1: Vercel environment variable'larini gir**

```env
VITE_API_URL=https://api.hakbul.com
VITE_MOCK_MODE=false
```

- [ ] **Step 2: Frontend deploy et**

Beklenen:
- `app.hakbul.com` uzerinden SPA acilir
- API cagrilari `https://api.hakbul.com` adresine gider

### Task 5: DNS ve CORS Dogrulamasi

**Files:**
- Reference: `docs/guides/production-min-cost-checklist.md`

- [ ] **Step 1: DNS kayitlarini dogrula**

Kontrol:
- `app.hakbul.com` -> Vercel
- `api.hakbul.com` -> Render

- [ ] **Step 2: CORS davranisini tarayicidan dogrula**

Beklenen:
- Frontend'den backend'e auth ve chat istekleri CORS hatasi vermeden calisiyor.

### Task 6: Go-Live Smoke Test

**Files:**
- Reference: `docs/guides/production-min-cost-checklist.md`
- Reference: `docs/reference/api.md`

- [ ] **Step 1: Health ve auth akislarini test et**

Testler:
- `GET /health`
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`

- [ ] **Step 2: Chat ve feedback akislarini test et**

Testler:
- `POST /ask`
- `POST /ask/stream`
- `POST /feedback`

- [ ] **Step 3: PDF ve admin akislarini test et**

Testler:
- `POST /documents/analyze`
- `POST /documents/compare`
- `GET /admin/users` (admin token)
- `GET /admin/weak-queries` (admin token)

### Task 7: Hard-Fail Policy Dogrulamasi

**Files:**
- Reference: `docs/guides/production-min-cost-checklist.md`

- [ ] **Step 1: Qdrant veya Groq secret'ini gecici boz**

Degisiklik:
- `QDRANT_URL` veya `GROQ_API_KEY` hatali degerle kaydet

- [ ] **Step 2: `/ask` istegi at**

Beklenen:
- `503` ve `error=upstream_unavailable`

- [ ] **Step 3: Secret'lari geri al ve yeniden deploy et**

Beklenen:
- Normal cevap akisina donus

### Task 8: Rollback Runbook Hazir Tutma

**Files:**
- Reference: `docs/guides/production-min-cost-checklist.md`

- [ ] **Step 1: Backend rollback adimini kaydet**

Render:
- Bir onceki basarili deploy'a don

- [ ] **Step 2: Frontend rollback adimini kaydet**

Vercel:
- Bir onceki basarili deployment'i promote et

- [ ] **Step 3: DB rollback adimini kaydet**

Render Postgres:
- Gerekirse snapshot'tan geri don

- [ ] **Step 4: Rollback sonrasi tekrar smoke test yap**

Minimum:
- `health`
- auth login
- `/ask`
