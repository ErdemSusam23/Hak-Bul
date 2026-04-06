# Ortam Değişkenleri Kurulum Rehberi

Bu proje iki farklı ortam için ayrı `.env` dosyası kullanır: local geliştirme ve Docker.

---

## Dosya Yapısı

```
backend/
├── .env               # Local geliştirme (git'e eklenmez)
├── .env.docker        # Docker ortamı (git'e eklenmez)
├── .env.example       # Local için şablon (git'te tutulur)
└── .env.docker.example  # Docker için şablon (git'te tutulur)
```

> `.env` ve `.env.docker` dosyaları asla git'e commit edilmez. Şablonları kopyalayarak oluşturulur.

---

## Kurulum

### 1. Local Geliştirme

`.env.example` dosyasını kopyala:

```bash
cp backend/.env.example backend/.env
```

`backend/.env` dosyasını düzenle:

```env
DATABASE_URL=postgresql+psycopg://db_user:db_password@localhost:5432/db_name
#                                                       ↑ localhost
```

Local çalıştırma:

```bash
cd backend
uvicorn main:app --reload
```

---

### 2. Docker ile Çalıştırma

`.env.docker.example` dosyasını kopyala:

```bash
cp backend/.env.docker.example backend/.env.docker
```

`backend/.env.docker` dosyasını düzenle:

```env
DATABASE_URL=postgresql+psycopg://db_user:db_password@postgres:5432/db_name
#                                                       ↑ postgres (container servis adı)
```

> ⚠️ `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` ile `DATABASE_URL` içindeki değerlerin birbiriyle tutarlı olması gerekir.

Docker ile çalıştırma:

```bash
docker compose up -d --build
```

---

## Local ve Docker Arasındaki Tek Fark

| | Local (`.env`) | Docker (`.env.docker`) |
|---|---|---|
| `DATABASE_URL` host | `localhost` | `postgres` |
| Postgres credentials | — | `POSTGRES_*` değişkenleri eklenir |

---

## Production Önerilen Flag'ler

Production ortamında aşağıdaki ayarları açıkça set et:

```env
CORS_ORIGINS=https://<your-project>.vercel.app
COOKIE_SECURE=true
COOKIE_SAMESITE=none
EMBEDDING_MODEL=intfloat/multilingual-e5-base
STRICT_UPSTREAMS=true
ALLOW_LOCAL_RETRIEVAL_FALLBACK=false
MOCK_RETRIEVAL=false
MOCK_LLM=false
```

Production kurulumunda embedding backend icinde calisir; ayri embedding servisi gerekmez.

`STRICT_UPSTREAMS=true` ve `ALLOW_LOCAL_RETRIEVAL_FALLBACK=false` birlikte kullanıldığında,
Qdrant/Groq erişilemezse `/ask` ve `/ask/stream` endpoint'leri 503 döner (hard-fail politika).

---

## ⚠️ Önemli Notlar

**Volume sıfırlama:** `.env.docker`'da Postgres credentials'ı değiştirirsen eski volume'u silmen gerekir, aksi halde şifre uyuşmazlığı yaşanır:

```bash
docker compose down -v   # ⚠️ Tüm veritabanı verisini siler
docker compose up -d --build
```

**`load_dotenv` davranışı:** Backend kodu `load_dotenv(override=False)` kullanır. Bu sayede Docker tarafından inject edilen env variable'lar `.env` dosyasıyla ezilmez. `.env` dosyası yalnızca set edilmemiş değişkenler için fallback görevi görür.

---

## Sık Yapılan Hatalar

| Hata | Sebep | Çözüm |
|---|---|---|
| `password authentication failed` | Volume eski şifreyle initialize edilmiş | `docker compose down -v` ile volume'u sıfırla |
| `No address associated with hostname` | `DATABASE_URL`'de `localhost` kullanılmış | Docker env'de host'u `postgres` yap |
| Env değişkeni geçersiz kalıyor | `load_dotenv()` Docker env'i eziyor | `load_dotenv(override=False)` kullan |

