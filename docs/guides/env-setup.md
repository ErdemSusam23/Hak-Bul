# Ortam Degiskenleri Kurulum Rehberi

Bu proje local gelistirme ve Docker icin ayri env dosyalari kullanir.

---

## Dosya Yapisi

```text
backend/
|-- .env
|-- .env.docker
|-- .env.example
`-- .env.docker.example

frontend/
|-- .env
`-- .env.example
```

Notlar:

- `.env` ve `.env.docker` dosyalari git'e commit edilmez.
- Gercek kurulumlar `.example` dosyalarinin kopyasi uzerinden yapilir.

---

## Local Gelistirme

`.env.example` dosyasini kopyala:

```bash
cp backend/.env.example backend/.env
```

Temel local ornegi:

```env
DATABASE_URL=postgresql+psycopg://db_user:db_password@localhost:5432/db_name
```

Backend local calistirma:

```bash
cd backend
uvicorn main:app --reload
```

Frontend local `.env` ornegi:

```env
VITE_API_URL=
VITE_PROXY_TARGET=http://localhost:8000
VITE_MOCK_MODE=false
```

Not:

- `VITE_API_URL` bos kalirsa frontend API isteklerini ayni origin'e yollar.
- `VITE_PROXY_TARGET`, Vite gelistirme sunucusunun istekleri iletecegi backend adresidir.
- Bu yapida tarayici `http://localhost:5173/auth/profile` gibi frontend origin'li istekleri gorur; Vite bu istegi arkada `http://localhost:8000/auth/profile` adresine proxy'ler.

---

## Docker

`.env.docker.example` dosyasini kopyala:

```bash
cp backend/.env.docker.example backend/.env.docker
```

Temel Docker ornegi:

```env
DATABASE_URL=postgresql+psycopg://db_user:db_password@postgres:5432/db_name
```

Not:

- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` ile `DATABASE_URL` icindeki degerler birbiriyle tutarli olmalidir.

Docker calistirma:

```bash
docker compose up -d --build
```

Docker frontend reverse proxy notu:

- Compose icinde frontend container'i icin `VITE_API_URL=` ve `VITE_PROXY_TARGET=http://backend:8000` kullanilir.
- Docker network'unde `backend`, FastAPI servis adidir; container icinden `localhost:8000` backend'i degil frontend container'inin kendisini ifade eder.
- Tarayici yine `http://localhost:5173/...` origin'ini gorur; Vite container icinden istegi `http://backend:8000/...` adresine iletir.

---

## Local ve Docker Arasindaki Temel Fark

| Alan | Local (`.env`) | Docker (`.env.docker`) |
|---|---|---|
| `DATABASE_URL` host | `localhost` | `postgres` |
| Postgres credentials | Haricen verilir | `POSTGRES_*` ile birlikte tutulur |
| Frontend proxy target | `http://localhost:8000` | `http://backend:8000` |

---

## Production Onerilen Flag'ler

Production ortaminda asagidaki ayarlari acikca set et:

```env
CORS_ORIGINS=https://<your-project>.vercel.app
COOKIE_SECURE=true
COOKIE_SAMESITE=none
EMBEDDING_MODEL=intfloat/multilingual-e5-base
STRICT_UPSTREAMS=true
ALLOW_LOCAL_RETRIEVAL_FALLBACK=false
MOCK_RETRIEVAL=false
MOCK_LLM=false
HAKBUL_PERF_LOG=false
```

Notlar:

- Embedding backend icinde calisir; ayri embedding servisi gerekmez.
- `STRICT_UPSTREAMS=true` ve `ALLOW_LOCAL_RETRIEVAL_FALLBACK=false` birlikte kullanildiginda, Qdrant/Groq erisilemezse `/ask` ve `/ask/stream` endpoint'leri `503` doner.
- `HAKBUL_PERF_LOG=true` yalnizca gecici tanilama icin acilmalidir; rewrite, retrieval, generation ve `/ask`/`/ask/stream` surelerini backend loglarina yazar.

---

## Frontend Opsiyonel Flag'ler

Frontend `.env` icin ilgili opsiyonel debug flag'i:

```env
VITE_PERF_LOG=false
```

Not:

- `VITE_PERF_LOG=true` yapildiginda chat istemcisi browser console'a stream kilometre taslarini (`response_headers`, `first_chunk`, `meta`, `first_token`, `done`) loglar.

---

## Onemli Notlar

### Volume sifirlama

`.env.docker` icindeki Postgres credentials degisirse eski volume ile sifre uyusmazligi yasanabilir:

```bash
docker compose down -v
docker compose up -d --build
```

### `load_dotenv` davranisi

Backend `load_dotenv(override=False)` kullanir.

Bu sayede:

- Docker tarafindan inject edilen env variable'lar `.env` ile ezilmez.
- `.env` yalnizca set edilmemis degiskenler icin fallback gorevi gorur.

---

## Sik Yapilan Hatalar

| Hata | Sebep | Cozum |
|---|---|---|
| `password authentication failed` | Volume eski sifreyle initialize edilmistir | `docker compose down -v` ile volume'u sifirla |
| `No address associated with hostname` | Docker icinde `localhost` kullanilmistir | Docker env'de host'u `postgres` yap |
| Env degiskeni gecersiz kaliyor | `load_dotenv()` Docker env'ini eziyordur | `load_dotenv(override=False)` kullan |

