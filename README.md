# Hak-Bul - Turk Hukuk Asistani

Vatandaslarin Turkce hukuki sorularina, mevzuat ve ilgili kaynaklar uzerinden yanit ureten RAG tabanli web uygulamasi.

> Uyari: Bu sistem bilgi amaclidir, hukuki danismanlik degildir.

## Guncel Ozellikler

- FastAPI backend + React (Vite) frontend
- RAG pipeline (`/ask`) ve direkt arama (`/search`)
- JWT auth (register/login/refresh rotation/logout)
- Sohbet kaydi: girisli kullanici icin user bazli, misafir icin `guest_session_id` bazli gecmis
- Rate limit (`/ask` icin `20/minute`)
- Alembic migration altyapisi
- Docker Compose ile `postgres + backend + frontend` calistirma

## Proje Yapisi

```text
Hak-Bul/
|- backend/
|  |- alembic/
|  |- auth/
|  |- db/
|  |- models/
|  |- rag/
|  |- routers/
|  |- services/
|  |- tests/
|  |- main.py
|  |- config.py
|  |- requirements.txt
|- frontend/
|  |- src/
|  |- package.json
|- docs/
|  |- ENV_SETUP.md
|  |- frontend-auth-integration.md
|- docker-compose.yml
```

## Gereksinimler

- Python 3.11
- Node.js 20+
- npm
- Docker + Docker Compose (opsiyonel, tam stack icin)

## Local Gelistirme Kurulumu

### 1. Backend

```bash
cd backend
cp .env.example .env
```

`.env` icinde en azindan su alanlari doldur:

- `DATABASE_URL`
- `JWT_SECRET_KEY`
- `GROQ_API_KEY` (gercek LLM yaniti icin)
- `QDRANT_URL` ve `QDRANT_API_KEY` (varsa)

Bagimliliklar:

```bash
pip install -r requirements.txt
```

Migration:

```bash
alembic upgrade head
```

Backend'i baslat:

```bash
uvicorn main:app --reload
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Varsayilanlar:

- `VITE_API_URL=http://localhost:8000`
- `VITE_MOCK_MODE=false`

## Docker ile Calistirma

```bash
cp backend/.env.docker.example backend/.env.docker
docker compose up -d --build
```

Servisler:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000`
- Swagger: `http://localhost:8000/docs`
- Postgres: `localhost:5432`

Not:

- Docker backend acilisinda otomatik `alembic upgrade head` calisir.
- `DATABASE_URL` host'u Docker icinde `postgres` olmalidir.

## API Endpointleri

### Core

- `POST /ask`
- `GET /search`
- `GET /health`

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`

### Chat Gecmisi

- `GET /chat/history/{conversation_id}` (auth gerekir)
- `GET /chat/conversations` (auth gerekir)
- `GET /chat/guest/history/{conversation_id}?guest_session_id=...`
- `GET /chat/guest/conversations?guest_session_id=...`

## Bilinen Durumlar

- Backend chat gecmisi endpointleri aktif.
- Frontend tarafinda chat gecmisi backend endpointlerine tam entegre degil; su an kullanici bazli yerel gecmis (localStorage) kullanimi da bulunuyor.
- Qdrant ayari yoksa backend yerel corpus fallback moduna dusebilir.

## Testler

Backend testlerini calistirmak icin:

```bash
python -m pytest backend/tests -q
```

Mevcut kapsama:

- Auth akisi testleri
- Chat history persistence testleri (guest + user)

## Ek Dokumanlar

- `docs/ENV_SETUP.md`
- `docs/frontend-auth-integration.md`
- `docs/hak-bul-backend-docs.md`

## Guvenlik Notu

- Gercek `.env` ve `.env.docker` dosyalarini repoya commit etmeyin.
- API key ve JWT secret degerlerini production'da guvenli secret manager ile yonetin.
