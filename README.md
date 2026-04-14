# Hak-Bul - Türk Hukuk Asistanı

Vatandaşların Türkçe hukuki sorularına, mevzuat ve ilgili kaynaklar üzerinden yanıt üreten RAG tabanlı web uygulaması.

> **Uyarı:** Bu sistem bilgi amaçlıdır, hukuki danışmanlık değildir.

## Özellikler

- FastAPI backend + React (Vite) frontend
- RAG pipeline: soru yeniden yazma → Qdrant vektör araması → Groq LLM ile yanıt üretme (SSE streaming destekli)
- Soru kategorilendirme (İş, Kira, Tüketici, Aile, Ceza, İdare, Ticaret, Genel)
- Kritik konularda (ceza, boşanma, icra, tazminat) otomatik avukat yönlendirmesi (ALO 182)
- Cevap puanlama (👍/👎 feedback sistemi)
- JWT kimlik doğrulama (register / login / refresh token rotation / logout / profil yönetimi / hesap silme)
- Sohbet geçmişi: giriş yapmış kullanıcı için `user_id`, misafir için `guest_session_id` bazlı
- Sohbet başlıkları: ilk mesajdan otomatik üretilir; yeniden adlandırma ve silme desteklenir
- Sohbet paylaşma (URL-safe token, public görüntüleme) ve PDF olarak dışa aktarma
- PDF yükleme ve hukuki analiz (`/documents/analyze`)
- İki PDF belgesini karşılaştırma ve AI analizi (`/documents/compare`)
- Hukuki belge taslağı üretme — Kira, İş, İhtarname, Taahhütname (PDF çıktı)
- Admin analytics dashboard (kategori dağılımı, feedback istatistikleri, günlük aktivite, kullanıcı yönetimi, zayıf sorgu listesi)
- Çoklu dil arayüzü (Türkçe / İngilizce)
- Rate limiting (`/ask` ve `/ask/stream` için 20/dk, `/documents/compare` için 5/dk)
- Alembic migration altyapısı (6 migration)
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
│   ├── audits/             # Audit raporları
│   ├── tests/              # Test raporları
│   ├── guides/             # Kullanıcı/kurulum rehberleri
│   ├── contributing/       # Katkı rehberi
│   └── reference/          # Teknik referans dokümanları
├── scripts/                # Yardımcı scriptler
│   └── run_backend.py
├── docker-compose.yml
└── README.md
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

## Kurulum — Local Geliştirme

Bu repo için önerilen local geliştirme akışı şöyledir:

- PostgreSQL Docker içinde çalışır
- Backend local'de bir `venv` içinde çalışır
- Frontend local'de çalışır

Bu yapıda Docker sadece veritabanı için kullanılır. Backend local olduğu için `backend/.env` dosyasını okur; Postgres container'ı ise `backend/.env.docker` dosyasını kullanır.

> **Kritik fark:** Docker içindeki backend, Postgres'e `postgres:5432` üzerinden bağlanır. Local backend ise `localhost:5433` üzerinden bağlanmalıdır. Local `backend/.env` içinde yanlışlıkla `@postgres:5432` kalırsa `/auth/login` gibi DB kullanan endpoint'ler 500 hatası verir.

> **Öneri:** Repoda önceden var olan `backend/.env` veya `backend/.env.docker` dosyalarına güvenme; local kuruluma başlarken bu dosyaları yeniden oluştur veya içeriklerini tek tek doğrula.

### Adım 1 — Docker için Postgres env dosyasını hazırla

macOS / Linux:

```bash
cp backend/.env.docker.example backend/.env.docker
```

Windows PowerShell:

```powershell
Copy-Item backend/.env.docker.example backend/.env.docker
```

`backend/.env.docker` içinde en az şu alanları doldur:

```env
POSTGRES_DB=hak_bul
POSTGRES_USER=postgres
POSTGRES_PASSWORD=guclu_bir_sifre

DATABASE_URL=postgresql+psycopg://postgres:guclu_bir_sifre@postgres:5432/hak_bul
```

> `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` ve `DATABASE_URL` içindeki değerler birbiriyle uyumlu olmalıdır.

### Adım 2 — Sadece PostgreSQL container'ını başlat

```bash
docker compose up -d postgres
```

İstersen durumunu kontrol et:

```bash
docker compose ps
```

> Host makineden erişim portu `5433`'tür. Yani local backend, Postgres'e `localhost:5433` üzerinden bağlanır.

> **Devam etmeden önce:** `hak-bul-postgres` durumu `healthy` olmadan migration çalıştırma. İlk açılışta container birkaç saniye gecikebilir.

### Adım 3 — Local backend env dosyasını hazırla

macOS / Linux:

```bash
cd backend
cp .env.example .env
```

Windows PowerShell:

```powershell
Set-Location backend
Copy-Item .env.example .env
```

`backend/.env` dosyasını düzenle. Bu dosya local backend tarafından okunur, bu yüzden `DATABASE_URL` içinde host `localhost`, port ise `5433` olmalıdır:

```env
DATABASE_URL=postgresql+psycopg://postgres:guclu_bir_sifre@localhost:5433/hak_bul

# Güvenli rastgele bir string üret: python -c "import secrets; print(secrets.token_hex(32))"
JWT_SECRET_KEY=buraya_urettigin_degeri_yaz

GROQ_API_KEY=gsk_...
QDRANT_URL=https://xxxx.qdrant.io
QDRANT_API_KEY=...
```

> `backend/.env` içindeki veritabanı kullanıcı adı, şifre ve veritabanı adı; `backend/.env.docker` içindeki Postgres ayarlarıyla aynı olmalıdır.

> Doğru örnek farkı:
>
> - Docker/Postgres: `postgresql+psycopg://postgres:guclu_bir_sifre@postgres:5432/hak_bul`
> - Local backend: `postgresql+psycopg://postgres:guclu_bir_sifre@localhost:5433/hak_bul`

### Adım 4 — Backend için virtual environment oluştur ve aktive et

```bash
python -m venv venv
```

Windows PowerShell:

```powershell
.\venv\Scripts\Activate.ps1
```

macOS / Linux:

```bash
source venv/bin/activate
```

### Adım 5 — Backend bağımlılıklarını venv içine kur

```bash
pip install -r requirements.txt
```

### Adım 6 — Veritabanı migration'larını uygula

```bash
alembic upgrade head
```

Bu komut local geliştirmede şu senaryolarda çalıştırılmalıdır:

- İlk local kurulumda, backend'i ilk kez ayağa kaldırmadan önce
- Repodan yeni kod çektikten sonra ve yeni migration geldiyse
- Veritabanı volume'unu sıfırladıysan (`docker compose down -v`)
- `DATABASE_URL` başka bir veritabanına bakacak şekilde değiştiyse

Şu senaryolarda tekrar çalıştırman gerekmez:

- Sadece Python/React kodu değiştiyse ve şema değişmediyse
- Aynı veritabanı çalışıyorsa ve migration'lar zaten uygulanmışsa

### Adım 7 — Backend'i local'de başlat

```bash
uvicorn main:app --reload --port 8000
```

Backend açıldıktan sonra API şu adreste erişilebilir olur:

- `http://localhost:8000`
- Swagger: `http://localhost:8000/docs`

### Adım 8 — Frontend env dosyasını hazırla

Yeni bir terminal aç:

macOS / Linux:

```bash
cd frontend
cp .env.example .env
```

Windows PowerShell:

```powershell
Set-Location ..\frontend
Copy-Item .env.example .env
```

`frontend/.env` içeriği:

```env
VITE_API_URL=http://localhost:8000
VITE_MOCK_MODE=false
```

### Adım 9 — Frontend'i local'de başlat

```bash
npm install
npm run dev
```

Uygulama `http://localhost:5173` adresinde açılır.

### Sık karşılaşılan durumlar

Eğer Postgres şifresini veya kullanıcı bilgisini `backend/.env.docker` içinde değiştirdiysen ve container eski bilgilerle initialize edildiyse, volume'u sıfırlaman gerekebilir:

```bash
docker compose down -v
docker compose up -d postgres
```

Eğer local backend `500 Internal Server Error` veriyor ve loglarda bağlantı/host hatası görüyorsan ilk kontrol etmen gereken alan `backend/.env` içindeki `DATABASE_URL` değeridir. Local backend için host `localhost`, port `5433` olmalıdır.

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
| POST   | `/auth/register`  | Kayıt (rate: 5/dk) |
| POST   | `/auth/login`     | Giriş (access + refresh token döner) |
| POST   | `/auth/refresh`   | Token yenileme (rotation ile) |
| POST   | `/auth/logout`    | Çıkış (refresh token iptal) |
| GET    | `/auth/profile`   | Profil görüntüle |
| PUT    | `/auth/profile`   | Email / şifre güncelle |
| DELETE | `/auth/account`   | Hesabı kalıcı olarak sil |

### Sohbet Geçmişi

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/chat/history/{conversation_id}` | Sohbet mesajları (auth gerekir) |
| GET | `/chat/conversations` | Kullanıcının sohbet listesi — `title`, `message_count`, `last_message_at` döner |
| DELETE | `/chat/conversations/{id}` | Sohbeti sil |
| PATCH | `/chat/conversations/{id}/title` | Sohbet başlığını yeniden adlandır |
| GET | `/chat/conversations/{id}/export` | Sohbeti PDF olarak indir |
| POST | `/chat/conversations/{id}/share` | Paylaşım linki oluştur |
| DELETE | `/chat/conversations/{id}/share` | Paylaşımı kaldır |
| GET | `/chat/shared/{share_token}` | Paylaşılan sohbeti görüntüle (herkese açık) |
| GET | `/chat/guest/history/{conversation_id}?guest_session_id=...` | Misafir sohbet mesajları |
| GET | `/chat/guest/conversations?guest_session_id=...` | Misafir sohbet listesi |

### Döküman Analizi

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/documents/analyze` | PDF yükle, hukuki analiz yap (multipart/form-data: `dosya`, `soru`, `conversation_id`, `guest_session_id`) |
| POST | `/documents/compare` | İki PDF karşılaştır — `dosya1`, `dosya2`, `soru` (rate: 5/dk) |

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
| GET | `/admin/users` | Kullanıcı listesi |
| PATCH | `/admin/users/{id}/role` | Kullanıcı rolü güncelle |
| PATCH | `/admin/users/{id}/status` | Kullanıcı aktif/pasif durumu değiştir |
| GET | `/admin/weak-queries` | Düşük güven skorlu sorgu listesi |

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
    ↓
20260326_0006  weak_queries + shared_conversations tabloları
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

- [`docs/contributing/CONTRIBUTING.md`](docs/contributing/CONTRIBUTING.md) — Projeye katkı rehberi
- [`docs/guides/env-setup.md`](docs/guides/env-setup.md) — Ortam değişkenleri detaylı rehber
- [`docs/reference/api.md`](docs/reference/api.md) — API endpoint'leri ve şemalar
- [`docs/reference/database.md`](docs/reference/database.md) — PostgreSQL ve Qdrant şemaları
- [`docs/reference/rag-pipeline.md`](docs/reference/rag-pipeline.md) — RAG pipeline akışı
- [`docs/reference/tech-spec.md`](docs/reference/tech-spec.md) — Teknik gereksinimler ve mimari

## Yardımcı Scriptler
---

<div align="center">
  <sub>Hak-Bul Projesi • Son Güncelleme: 09.04.2026</sub>
</div>
