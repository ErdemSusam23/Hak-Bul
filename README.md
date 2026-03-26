# Hak-Bul - Türk Hukuk Asistanı

Vatandaşların Türkçe hukuki sorularına, mevzuat ve ilgili kaynaklar üzerinden yanıt üreten RAG tabanlı web uygulaması.

> **Uyarı:** Bu sistem bilgi amaçlıdır, hukuki danışmanlık değildir.

## Özellikler

- FastAPI backend + React (Vite) frontend
- RAG pipeline: soru yeniden yazma → Qdrant vektör araması → Groq LLM ile yanıt üretme
- Soru kategorilendirme (İş, Kira, Tüketici, Aile, Ceza, İdare, Ticaret, Genel)
- Cevap puanlama (👍/👎 feedback sistemi)
- JWT kimlik doğrulama (register / login / refresh token rotation / logout)
- Sohbet geçmişi: giriş yapmış kullanıcı için `user_id`, misafir için `guest_session_id` bazlı
- Sohbet başlıkları: ilk mesajdan otomatik üretilir
- PDF yükleme ve hukuki analiz (`/documents/analyze`)
- Hukuki belge taslağı üretme — Kira, İş, İhtarname, Taahhütname (PDF çıktı)
- Admin analytics dashboard (kategori dağılımı, feedback istatistikleri, günlük aktivite)
- Rate limiting (`/ask` için 20 istek/dakika)
- Alembic migration altyapısı
- Docker Compose ile tek komutla `postgres + backend + frontend` çalıştırma

## Proje Yapısı

```text
Hak-Bul/
├── backend/
│   ├── alembic/versions/   # Veritabanı migration dosyaları
│   ├── auth/               # JWT ve kimlik doğrulama
│   ├── db/                 # SQLAlchemy bağlantı ayarları
│   ├── models/             # ORM modelleri
│   ├── rag/                # RAG pipeline (retriever, rewriter, categorizer, generator)
│   ├── routers/            # API router'ları
│   ├── services/           # İş mantığı
│   ├── tests/              # Test dosyaları (39 test)
│   ├── main.py
│   ├── config.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   └── package.json
├── docs/
└── docker-compose.yml
```

## Gereksinimler

- Python 3.11
- Node.js 20+ ve npm
- Docker + Docker Compose (**önerilen yöntem**)
- Harici servis hesapları: [Groq](https://console.groq.com) API anahtarı, [Qdrant Cloud](https://cloud.qdrant.io) cluster'ı

---

## Kurulum — Docker ile (Önerilen)

Tüm bağımlılıkları, migration'ları ve servisleri tek seferde ayağa kaldırır.

### Adım 1 — Repo'yu klonla

```bash
git clone https://github.com/ErdemSusam23/Hak-Bul.git
cd Hak-Bul
```

### Adım 2 — Ortam değişkenlerini hazırla

```bash
cp backend/.env.docker.example backend/.env.docker
```

Ardından `backend/.env.docker` dosyasını bir editörde aç ve şu alanları doldur:

```env
# Postgres ayarları — üç alanda da aynı kullanıcı/şifre/db adını kullan
POSTGRES_DB=hakbul
POSTGRES_USER=hakbul_user
POSTGRES_PASSWORD=guclu_bir_sifre_yaz

# DATABASE_URL'deki kullanıcı, şifre ve db adı POSTGRES_ alanlarıyla eşleşmeli
DATABASE_URL=postgresql+psycopg://hakbul_user:guclu_bir_sifre_yaz@postgres:5432/hakbul

# Güvenli rastgele bir string üret: python -c "import secrets; print(secrets.token_hex(32))"
JWT_SECRET_KEY=buraya_urettığın_değeri_yaz

# Groq API anahtarın (https://console.groq.com)
GROQ_API_KEY=gsk_...

# Qdrant Cloud bilgilerin (https://cloud.qdrant.io)
QDRANT_URL=https://xxxx.qdrant.io
QDRANT_API_KEY=...
```

> **Not:** `CORS_ORIGINS`, `MOCK_*`, `EMBEDDING_MODEL`, `SCORE_THRESHOLD` alanlarını değiştirmene gerek yok, varsayılanlar çalışır.

### Adım 3 — Konteynerleri başlat

```bash
docker compose up -d --build
```

İlk çalıştırmada embedding modeli (`intfloat/multilingual-e5-base`) indirilir, bu birkaç dakika sürebilir.

### Adım 4 — Çalışıp çalışmadığını kontrol et

```bash
docker compose ps
```

Üç servis de `healthy` görünmeli:

```
hak-bul-postgres   Up (healthy)
hak-bul-backend    Up (healthy)
hak-bul-frontend   Up (healthy)
```

Sorun çıkarsa logları incele:

```bash
docker compose logs backend
docker compose logs frontend
```

### Adım 5 — Tarayıcıda aç

| Servis    | Adres                        |
|-----------|------------------------------|
| Uygulama  | http://localhost:5173         |
| API       | http://localhost:8000         |
| Swagger   | http://localhost:8000/docs    |

> **Not:** `alembic upgrade head` backend container açılışında otomatik çalışır, migration'ları elle uygulamana gerek yok.

### Konteynerleri durdur / sil

```bash
# Durdur (veri korunur)
docker compose down

# Durdur ve veritabanı verisini de sil
docker compose down -v
```

---

## Kurulum — Local Geliştirme (Docker olmadan)

Bu yöntem için PostgreSQL'in yerel makinende kurulu ve çalışıyor olması gerekir.

### Adım 1 — Ortam değişkenlerini hazırla

```bash
cd backend
cp .env.example .env
```

`.env` dosyasında şu alanları doldur:

```env
DATABASE_URL=postgresql+psycopg://kullanici:sifre@localhost:5432/db_adi

# Güvenli rastgele bir string üret: python -c "import secrets; print(secrets.token_hex(32))"
JWT_SECRET_KEY=buraya_urettığın_değeri_yaz

GROQ_API_KEY=gsk_...
QDRANT_URL=https://xxxx.qdrant.io
QDRANT_API_KEY=...
```

> SQLite ile hızlı test için: `DATABASE_URL=sqlite:///./dev.db`

### Adım 2 — Python bağımlılıklarını kur

```bash
# backend/ klasöründeyken
pip install -r requirements.txt
```

### Adım 3 — Veritabanı migration'larını uygula

```bash
alembic upgrade head
```

### Adım 4 — Backend'i başlat

```bash
uvicorn main:app --reload --port 8000
```

### Adım 5 — Frontend ortam değişkenlerini hazırla

```bash
cd ../frontend
cp .env.example .env
```

`.env` içeriği (varsayılanlar genellikle yeterli):

```env
VITE_API_URL=http://localhost:8000
VITE_MOCK_MODE=false
```

### Adım 6 — Frontend bağımlılıklarını kur ve başlat

```bash
npm install
npm run dev
```

Uygulama `http://localhost:5173` adresinde açılır.

---

## API Endpointleri

### Core

| Method | Endpoint   | Açıklama |
|--------|------------|----------|
| POST   | `/ask`     | Hukuki soru sor (RAG pipeline, rate limited) |
| GET    | `/search`  | Kanun maddesi veya dava numarasına göre ara |
| GET    | `/health`  | Servis sağlık durumu |

### Auth

| Method | Endpoint          | Açıklama |
|--------|-------------------|----------|
| POST   | `/auth/register`  | Kayıt |
| POST   | `/auth/login`     | Giriş (access + refresh token döner) |
| POST   | `/auth/refresh`   | Token yenileme (rotation ile) |
| POST   | `/auth/logout`    | Çıkış (refresh token iptal) |

### Sohbet Geçmişi

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/chat/history/{conversation_id}` | Sohbet mesajları (auth gerekir) |
| GET | `/chat/conversations` | Kullanıcının sohbet listesi — `title`, `message_count`, `last_message_at` döner |
| GET | `/chat/guest/history/{conversation_id}?guest_session_id=...` | Misafir sohbet mesajları |
| GET | `/chat/guest/conversations?guest_session_id=...` | Misafir sohbet listesi |

### Döküman Analizi

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/documents/analyze` | PDF yükle, hukuki analiz yap (multipart/form-data: `dosya`, `soru`, `conversation_id`, `guest_session_id`) |

### Hukuki Belge Taslakları

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/templates` | Mevcut taslaklar ve gerekli alanlar |
| POST | `/templates/{template_id}/generate` | Doldurulmuş alanlarla PDF üret ve indir |

Desteklenen taslaklar: `kira_sozlesmesi`, `is_sozlesmesi`, `ihtarname`, `taahhutname`

### Feedback

| Method | Endpoint     | Açıklama |
|--------|--------------|----------|
| POST   | `/feedback`  | Cevaba 👍 (+1) veya 👎 (-1) ver (`message_id` + `puan`) |

### Admin Analytics

> Tüm endpoint'ler `ADMIN` rolü gerektirir.

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/admin/stats` | Toplam kullanıcı, mesaj, konuşma, feedback özeti |
| GET | `/admin/stats/categories` | Kategori bazlı soru dağılımı |
| GET | `/admin/stats/feedback` | 👍/👎 sayıları ve beğeni oranı |
| GET | `/admin/stats/daily?gun=7` | Son N günün günlük mesaj aktivitesi |

---

## Veritabanı Migration Zinciri

```
20260305_0001  auth tabloları (users, refresh_tokens)
    ↓
20260305_0002  chat_history + misafir desteği
    ↓
20260316_0003  category kolonu
    ↓
20260317_0004  message_feedback tablosu
    ↓
20260317_0005  title kolonu (sohbet başlıkları)
```

---

## Testler

```bash
# Docker içinde çalıştır
docker exec hak-bul-backend python -m pytest tests/ -v

# Ya da local geliştirmede (backend/ klasöründeyken)
python -m pytest tests/ -v
```

Mevcut test kapsamı (39 test):
- Auth akışı (register, login, refresh rotation, logout)
- Sohbet geçmişi (guest + user bazlı)
- Feedback endpoint'i (validasyon, 404, 👍/👎 kaydetme, güncelleme)
- PDF döküman servisi (metin çıkarma, boyut limiti, truncation)
- PDF analiz endpoint'i (DB kayıt, 400 hataları)
- Hukuki belge taslakları (liste, PDF üretimi, validasyon)
- Admin analytics (yetki kontrolleri, veri doğrulama)

---

## Bilinen Durumlar

- Frontend sohbet geçmişi backend `/chat/*` endpoint'leriyle entegre çalışmaktadır (`sohbetGecmisiListeleAPI()` / `misafirSohbetGecmisiListeleAPI()`).
- Qdrant ayarı yapılmazsa backend yerel JSON corpus ile fallback moduna düşer (kısıtlı içerik).
- Türkçe karakter desteği için container'da `fonts-dejavu-core` kurulu olması önerilir (`apt-get install fonts-dejavu-core`); yoksa PDF taslakları ğ/ı dışındaki karakterleri doğru render eder.

---

## Ek Belgeler

- [`docs/guides/env-setup.md`](docs/guides/env-setup.md) — Ortam değişkenleri detaylı rehber
- [`docs/reference/api.md`](docs/reference/api.md) — API endpoint'leri ve şemalar
- [`docs/reference/database.md`](docs/reference/database.md) — PostgreSQL ve Qdrant şemaları
- [`docs/reference/rag-pipeline.md`](docs/reference/rag-pipeline.md) — RAG pipeline akışı
- [`docs/reference/tech-spec.md`](docs/reference/tech-spec.md) — Teknik gereksinimler ve mimari

---

<div align="center">
  <sub>Hak-Bul Projesi • Son Güncelleme: 26.03.2026</sub>
</div>
