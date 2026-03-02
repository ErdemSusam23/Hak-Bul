# 🏛️ Hak-Bul — Türk Hukuk Asistanı

Vatandaşların günlük Türkçe ile sordukları hukuki sorulara, Mevzuat.gov.tr ve Yargıtay kararlarını kaynak alarak otomatik yanıt üreten RAG tabanlı web uygulaması.

> ⚠️ Bu sistem bilgi sunma amacıyla çalışır. Hukuki danışmanlık niteliği taşımaz.

---

## 📁 Proje Yapısı

```
Hak-Bul/
├── backend/        # FastAPI + RAG pipeline
└── frontend/       # React + Vite (henüz kurulmadı)
```

---

## 🚀 Backend Kurulum

### Gereksinimler
- Python 3.11 → https://www.python.org/downloads/release/python-3119/
- Git

### 1. Repoyu klonla

```bash
git clone https://github.com/YOUR_ORG/Hak-Bul.git
cd Hak-Bul/backend
```

### 2. Virtual environment oluştur

```bash
# Windows
py -3.11 -m venv venv
.\venv\Scripts\activate

# macOS / Linux
python3.11 -m venv venv
source venv/bin/activate
```

### 3. Bağımlılıkları kur

```bash
pip install -r requirements.txt
```

### 4. Environment variables

```bash
cp .env.example .env
```

`.env` dosyasını aç, değerleri doldur:

```env
GROQ_API_KEY=your_key_here
QDRANT_URL=https://your-cluster.qdrant.io
QDRANT_API_KEY=your_key_here
QDRANT_COLLECTION=hukuk_chunks
SCORE_THRESHOLD=0.65
MOCK_RETRIEVAL=true    # Qdrant 
MOCK_LLM=false         # Groq 
```

> Groq API key almak için → https://console.groq.com  
> Qdrant Cloud hesabı açmak için → https://cloud.qdrant.io

### 5. Uygulamayı başlat

```bash
uvicorn main:app --reload
```

Uygulama ayağa kalktığında:
- API: http://localhost:8000
- Swagger UI (test arayüzü): http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

---

## 🧪 MOCK_MODE

Groq API key ve Qdrant bağlantısı olmadan geliştirme yapabilmek için `.env` dosyasında `MOCK_...=true` bırak. Bu modda:

- Query rewriting adımı mock yanıt döner
- Qdrant yerine sabit bir örnek chunk kullanılır
- LLM çağrısı yapılmaz

Gerçek API'ye geçmek için `.env`'de `MOCK_...=false` yap ve key'leri doldur.

---

## 📡 API Endpointleri

| Method | Endpoint  | Açıklama |
|--------|-----------|----------|
| POST   | `/ask`    | Hukuki soru sor, kaynak atıflı yanıt al |
| GET    | `/search` | Kanun maddesi veya dava no ile direkt arama |
| GET    | `/health` | Sistem sağlık kontrolü |

Detaylı API dokümantasyonu → `backend/` klasöründeki `turk-hukuk-backend-docs.docx`

### Örnek istek — POST /ask

```json
{
  "soru": "Kıdem tazminatı almak için ne kadar çalışmam gerekiyor?",
  "max_kaynak": 5
}
```

### Örnek yanıt

```json
{
  "yanit": "...",
  "kaynaklar": [
    {
      "kaynak_turu": "kanun",
      "baslik": "4857 Sayılı İş Kanunu — Madde 17",
      "metin_ozet": "...",
      "skor": 0.91
    }
  ],
  "uyari": "Bu yanıt bilgi amaçlıdır ve hukuki tavsiye niteliği taşımaz."
}
```

## 🐳 Docker ile Çalıştırma (Deployment)

Geliştirmede venv kullanılır. Deployment için Dockerfile hazır.

```bash
cd backend
docker build -t hak-bul-backend .
docker run -p 8000:8000 --env-file .env hak-bul-backend
```

---

## 🗂️ Backend Dizin Yapısı

```
backend/
├── main.py                  # FastAPI app, rate limiter, endpointler
├── schemas.py               # Pydantic modelleri
├── config.py                # Environment variables
├── requirements.txt
├── Dockerfile
├── .env.example
├── rag/
│   ├── pipeline.py          # RAG adımlarını birleştiren ana fonksiyon
│   ├── query_rewriter.py    # Adım 1: Query rewriting (Groq 8B)
│   ├── retriever.py         # Adım 2-3: Vektör arama + skor filtresi
│   └── generator.py         # Adım 4: Yanıt üretme (Groq 70B)
├── data/
│   ├── raw/                 # Ham scraping çıktıları
│   └── processed/           # Chunk JSON'ları
└── scripts/
    ├── chunk_kanun.py        # Kanun metni chunking
    ├── chunk_yargitay.py     # Yargıtay kararı chunking
    └── load_qdrant.py        # Qdrant'a yükleme
```
