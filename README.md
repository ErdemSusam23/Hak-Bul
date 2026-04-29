# Hak-Bul - Türk Hukuk Asistanı

Vatandaşların Türkçe ve İngilizce hukuki sorularına, mevzuat ve ilgili kaynaklar üzerinden yanıt üreten RAG tabanlı web uygulaması.

> Uyarı: Bu sistem bilgi amaçlıdır, hukuki danışmanlık değildir.

## Özellikler

- FastAPI backend + React/Vite frontend
- RAG pipeline: kategori tespiti -> query rewrite -> Qdrant retrieval -> category penalty -> koşullu rerank -> Groq ile yanıt üretimi
- 14 hukuk kategorisi: İş, Medeni, Ceza, Ticaret, Tüketici, Taşınmaz Mülk, İdare, Vergi, Sosyal Güvenlik, Fikri Mülkiyet, Bilişim, Anayasa, Usul, Genel
- SSE streaming yanıt (`POST /ask/stream`)
- Kaynak özeti, skor ve resmi mevzuat bağlantıları
- JWT auth: kayıt, giriş, refresh rotation, çıkış, profil güncelleme, hesap pasifleştirme
- Kullanıcı ve misafir sohbet geçmişi
- Sohbet yeniden adlandırma, paylaşma ve PDF dışa aktarma
- PDF analiz ve iki PDF karşılaştırma
- Hukuki belge taslakları ve PDF üretimi
- Forum: başlık, yanıt, oy, avukat/admin doğrulama ve kilitleme
- Admin dashboard: istatistikler, kullanıcı yönetimi, zayıf sorgular
- Türkçe / İngilizce arayüz
- Local corpus fallback ve opsiyonel kanun collection merge

## Desteklenen Taslaklar

- `kira_sozlesmesi`
- `is_sozlesmesi`
- `ihtarname`
- `taahhutname`
- `vekaletname`
- `bosanma_dilekce`
- `icra_itiraz_dilekce`
- `tuketici_sikayet_dilekce`

## Proje Yapısı

```text
Hak-Bul/
├── backend/
│   ├── alembic/versions/
│   ├── auth/
│   ├── db/
│   ├── models/
│   ├── rag/
│   ├── routers/
│   ├── services/
│   ├── tests/
│   ├── data/
│   ├── main.py
│   ├── config.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   ├── scripts/
│   └── package.json
├── docs/
│   ├── archive/
│   ├── audits/
│   ├── contributing/
│   ├── guides/
│   ├── reference/
│   ├── superpowers/
│   └── tests/
├── docker-compose.yml
├── AGENTS.md
├── CLAUDE.md
└── README.md
```

## Gereksinimler

- Python 3.11
- Node.js 20+
- Docker + Docker Compose
- Groq API key
- Qdrant Cloud hesabı veya local fallback için yerel corpus

## Hızlı Başlangıç

### Docker

```bash
docker compose up -d --build
```

Uygulama:
- Frontend: `http://localhost:5173`
- API: `http://localhost:8000`
- Swagger: `http://localhost:8000/docs`

Notlar:
- `migrate` servisi migration ve admin seed adımını ayrı image ile çalıştırır.
- `20260428_0010` migration'ı sadece `APP_ENV=local|dev|development` ise demo forum/chat/share verisi üretir.

### Local Geliştirme

Backend:

```bash
cd backend
pip install -r requirements.txt
alembic upgrade head
uvicorn main:app --reload --port 8000
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Önemli Endpoint Grupları

- Core: `/ask`, `/ask/stream`, `/search`, `/health`
- Auth: `/auth/*`
- Chat: `/chat/*`
- Documents: `/documents/*`
- Templates: `/templates/*`
- Forum: `/forum/*`
- Feedback: `/feedback`
- Admin: `/admin/*`

Detaylı şemalar için `docs/reference/api.md` dosyasına bak.

## Migration Zinciri

```text
20260305_0001  auth tabloları
    ->
20260305_0002  chat history + guest support
    ->
20260316_0003  category kolonu
    ->
20260317_0004  message_feedback
    ->
20260317_0005  title kolonu
    ->
20260326_0006  weak_queries + shared_conversations
    ->
20260326_0007  chat_history.deleted_at
    ->
20260330_0008  lawyer role
    ->
20260330_0009  forum tabloları
    ->
20260428_0010  local/dev demo seed verisi
```

## Test

Test çalıştırmadan önce ortam tercihini sor: `local` veya `docker`.

Backend:

```bash
# Docker
docker exec hak-bul-backend python -m pytest tests/ -q

# Local (backend/ içinde)
python -m pytest tests/ -q
```

Frontend:

```bash
cd frontend
npm test
npm run lint
npm run build
```

## Güncel Notlar

- Guest oturumu `guest_session_id` HttpOnly cookie ile yönetilir.
- `/ask` ve `/ask/stream` authsuz kullanımda guest session cookie set eder.
- Query rewrite modeli `llama-3.1-8b-instant`, answer/document generation modeli `llama-3.3-70b-versatile`.
- Retrieval fallback corpus'u `backend/data/processed_backup_*` altında 33 kanun dosyasından oluşur.
- Avukat yönlendirmesi sabit bir telefon numarasına değil, baro hukuki yardım bürosu veya avukata başvuru önerisine dayanır.

## Ek Belgeler

- `docs/reference/api.md`
- `docs/reference/database.md`
- `docs/reference/rag-pipeline.md`
- `docs/contributing/CONTRIBUTING.md`
- `docs/guides/env-setup.md`

<div align="center">
  <sub>Hak-Bul Projesi • Son Güncelleme: 29.04.2026</sub>
</div>
