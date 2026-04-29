# OSTİM TEKNİK ÜNİVERSİTESİ MÜHENDİSLİK FAKÜLTESİ
## BİTİRME PROJESİ RAPORU

**Hak-Bul: Türk Hukuku İçin Yapay Zeka Destekli Hukuk Asistanı Web Uygulaması**

| | |
|---|---|
| **Öğrenciler** | Erdem Susam — [EKLENECEK] |
| | Mustafa Şahin — [EKLENECEK] |
| | Ömer Faruk Güneş — [EKLENECEK] |
| | Yağız Han Aslan — [EKLENECEK] |
| **Bölüm** | Bilgisayar Mühendisliği |
| **Proje Danışmanı** | Dr. Nergiz Khankishiyeva Hati |
| **Ders** | SENG 400 Bitirme Projesi |
| **Projeye Başlama Tarihi** | [EKLENECEK] |
| **Rapor Sunum Tarihi** | [EKLENECEK] |

---

## Teşekkür

Bu projenin tamamlanmasında bize rehberlik eden, desteğini ve bilgisini hiçbir zaman esirgemeyen danışman hocamız **Dr. Nergiz Khankishiyeva Hati**'ye en içten teşekkürlerimizi sunuyoruz. Proje süresince yaptığı yapıcı eleştiriler ve yönlendirmeler, çalışmamızın kalitesini doğrudan etkiledi.

OSTİM Teknik Üniversitesi Yazılım Mühendisliği Bölümü'nün tüm akademik ve idari kadrosuna, bize sağladıkları eğitim ortamı ve destek için teşekkür ederiz.

Proje geliştirme sürecinde fikir ve geri bildirimleriyle katkıda bulunan sınıf arkadaşlarımıza ve çevremize şükranlarımızı iletiyoruz.

Son olarak, bu süreç boyunca bize gösterdikleri sabır ve destekten dolayı ailelerimize minnettarız.

---

## Özet

Hukuki bilgiye erişim, Türkiye'de vatandaşların büyük çoğunluğu için hâlâ güçtür. Çok sayıda kanun, yönetmelik ve içtihat kararının karmaşık yapısı, hukuki yardım almak isteyen bireyler için ciddi bir engel oluşturmaktadır. Bu bitirme projesi, söz konusu problemi yapay zeka teknolojileriyle ele alan **Hak-Bul** adlı bir web uygulaması geliştirmeyi amaçlamıştır.

Hak-Bul, vatandaşların Türkçe hukuki sorularını doğal dille sorabildiği ve Türk mevzuatına dayalı kaynak gösterimli yanıtlar alabileceği bir sistemdir. Sistemin temelinde **RAG (Retrieval-Augmented Generation)** mimarisi yatmaktadır: kullanıcının sorusu önce 14 hukuki kategoriden birine sınıflandırılmakta, ardından sorgu yeniden yazılmakta, **Qdrant** vektör veritabanından (75.789 hukuki metin parçası — 66.755 Yargıtay kararı ve 9.034 kanun maddesi) ilgili kaynaklar getirilmekte ve **Groq API** üzerinden çalışan **Llama-3.3-70b-versatile** büyük dil modeli tarafından yanıt üretilmektedir.

Uygulama; **FastAPI** tabanlı bir REST API, **React 19 + Vite** ile geliştirilmiş modern bir frontend ve **PostgreSQL** veritabanından oluşmaktadır. JWT kimlik doğrulama, misafir oturum desteği, SSE ile gerçek zamanlı streaming yanıt, PDF belge analizi ve karşılaştırma, hukuki belge şablonu üretimi, topluluk forumu ve bir admin analitik paneli gibi özellikler sisteme entegre edilmiştir. Tüm altyapı Docker Compose ile üç servis olarak konteynerize edilmiştir.

Uygulama, ceza, boşanma ve icra gibi kritik konularda otomatik olarak kullanıcıyı Adalet Bakanlığı ALO 182 hattına yönlendirmektedir. Sistem; 64 otomatik test (%100 başarı), 100 soruluk sistem testi ve retrieval baseline ölçümleriyle kapsamlı biçimde değerlendirilmiştir.

---

## İçindekiler

1. [Giriş](#bölüm-1-giriş)
2. [Teorik Arka Plan](#bölüm-2-teorik-arka-plan)
3. [Kullanılan Araçlar ve Teknolojiler](#bölüm-3-kullanılan-araçlar-ve-teknolojiler)
4. [Sistem Tasarımı ve İmplementasyon](#bölüm-4-sistem-tasarımı-ve-i̇mplementasyon)
5. [Özellikler ve API](#bölüm-5-özellikler-ve-api)
6. [Test ve Değerlendirme](#bölüm-6-test-ve-değerlendirme)
7. [Sonuçlar ve Öneriler](#bölüm-7-sonuçlar-ve-öneriler)
8. [Kaynakça](#kaynakça)

---

## Bölüm 1: Giriş

### 1.1 Proje Arka Planı ve Motivasyon

Türkiye'de hukuki bilgiye erişim, hem ekonomik hem de pratik açıdan büyük bir güçlük barındırmaktadır. Avukatlık ücretleri, bireylerin büyük çoğunluğunun erişemeyeceği düzeyde olabilmekte; aynı zamanda yüzlerce kanun, binlerce yönetmelik ve sürekli güncellenen içtihat kararlarından oluşan mevzuat yapısı, hukuki bilgiye ulaşmayı sıradan vatandaşlar için son derece zorlaştırmaktadır.

Son yıllarda yapay zeka alanında yaşanan gelişmeler, özellikle Büyük Dil Modelleri (LLM) ve RAG mimarisinin olgunlaşmasıyla birlikte, bu alanda erişilebilir ve güvenilir bir araç geliştirmek mümkün hale gelmiştir. Bu proje, söz konusu teknolojik fırsatı kullanarak Türk hukuku özelinde çalışan, kaynak gösterebilen ve kritik konularda profesyonel yönlendirme yapabilen bir asistan geliştirmeyi hedeflemiştir.

### 1.2 Proje Hedefleri

Bu projenin temel hedefleri şunlardır:

- Türkçe doğal dil soruları kabul eden, Türk mevzuatına dayalı yanıtlar üretebilen bir RAG pipeline geliştirmek
- Yanıtları 14 hukuki kategoride sınıflandırarak ilgili mevzuat kaynaklarıyla desteklemek
- Ceza, boşanma, icra ve tazminat gibi kritik hukuki konularda kullanıcıyı profesyonel hukuki destek kanallarına yönlendirmek
- JWT kimlik doğrulama, misafir oturum ve rol tabanlı yetkilendirme (kullanıcı / avukat / yönetici) içeren güvenli bir kullanıcı sistemi oluşturmak
- PDF belge yükleme ve hukuki analiz ile iki belge arasında karşılaştırma özelliği sunmak
- Topluluk forumu ve hukuki belge şablonu üretimi gibi tamamlayıcı araçlarla sistemin kapsamını genişletmek
- Uygulamayı Docker Compose ile konteynerize ederek tekrarlanabilir ve taşınabilir bir altyapı kurmak
- Otomatik testler ve sistem değerlendirme metrikleriyle yazılım kalitesini ölçmek

### 1.3 Proje Kapsamı

Proje kapsamı şu bileşenlerden oluşmaktadır:

- **Backend:** FastAPI ile geliştirilmiş REST API (8 router, 77+ endpoint)
- **Frontend:** React 19 + Vite ile geliştirilmiş SPA (9 sayfa, 9 bileşen)
- **Vektör veritabanı:** Qdrant Cloud (75.789 hukuki chunk — 66.755 Yargıtay kararı + 9.034 kanun maddesi, `intfloat/multilingual-e5-base` embedding modeli)
- **İlişkisel veritabanı:** PostgreSQL (10 tablo, 9 Alembic migrasyonu)
- **LLM entegrasyonu:** Groq API üzerinden Llama-3.3-70b-versatile
- **Konteynerizasyon:** Docker Compose (3 servis)

> **Not:** Proje kapsamı sistemi geliştirme ve işlevsel testlerini kapsamaktadır. RAGAS tabanlı otomatik değerlendirme pipeline'ı ve production ortamına deploy gelecek çalışma olarak planlanmıştır.

### 1.4 Raporun Yapısı

| Bölüm | İçerik |
|-------|--------|
| Bölüm 1 | Giriş, motivasyon, hedefler ve proje kapsamı |
| Bölüm 2 | LegalTech, LLM, RAG mimarisi ve vektör veritabanları hakkında teorik arka plan |
| Bölüm 3 | Projede kullanılan araçlar ve teknolojiler |
| Bölüm 4 | Sistem tasarımı: RAG pipeline, kimlik doğrulama, veritabanı ve frontend yapısı |
| Bölüm 5 | Uygulama özellikleri ve API endpoint'leri |
| Bölüm 6 | Test sonuçları ve sistem değerlendirmesi |
| Bölüm 7 | Proje çıktıları ve gelecek çalışma önerileri |

---

## Bölüm 2: Teorik Arka Plan

### 2.1 Hukuk Teknolojileri (LegalTech)

LegalTech, hukuki süreçleri otomatikleştirmek veya kolaylaştırmak amacıyla bilişim teknolojilerinin hukuk alanında uygulanmasını ifade eder. Bu alan; belge analizi, sözleşme yönetimi, hukuki araştırma ve danışmanlık destek sistemleri gibi çok farklı alt kategorileri kapsar.

Özellikle yapay zeka ile güçlendirilen LegalTech uygulamaları son yıllarda hız kazanmıştır. Doğal dil işleme (NLP) tekniklerinin gelişmesiyle birlikte, hukuki metinleri anlayabilen ve yorumlayabilen sistemler ortaya çıkmaktadır. Ancak Türkçe gibi morfolojik açıdan karmaşık dillerde ve Türk hukuku gibi spesifik yargı sistemlerinde bu sistemlerin uygulanması hâlâ önemli bir araştırma alanı olmaya devam etmektedir.

Hak-Bul, Türk hukuku özelinde çalışan, kaynakları gösterebilen ve kritik konularda profesyonel yönlendirme yapabilen bir LegalTech asistanı olarak bu boşluğu doldurmayı hedeflemektedir.

### 2.2 Büyük Dil Modelleri (LLM)

Büyük Dil Modelleri (Large Language Models — LLM), milyarlarca parametreyle eğitilmiş derin öğrenme modellerdir. Bu modeller, verilen bağlama göre anlamlı ve tutarlı metin üretebilme kapasitesine sahiptir. Transformer mimarisine dayanan LLM'ler, özellikle GPT, Llama ve benzeri modeller aracılığıyla doğal dil anlama ve üretme alanında çığır açmıştır.

Bu projede, Groq'un hızlı çıkarım (inference) altyapısı üzerinden erişilen **Meta Llama-3.3-70b-versatile** modeli kullanılmaktadır. Groq'un LPU (Language Processing Unit) mimarisi, yanıt gecikmesini minimize ederek kullanıcıya yakın gerçek zamanlı bir deneyim sunmaktadır. Sistem, SSE (Server-Sent Events) protokolüyle token token streaming de desteklemektedir.

### 2.3 Retrieval-Augmented Generation (RAG)

RAG, büyük dil modellerinin yalnızca eğitim verisindeki bilgiyle sınırlı kalmasından doğan "halüsinasyon" problemini çözmek amacıyla geliştirilmiş bir mimaridir. Bu yaklaşımda, kullanıcının sorusuna yanıt üretilmeden önce harici bir bilgi tabanından ilgili belgeler getirilir; ardından bu belgeler modele bağlam (context) olarak sunulur.

Hak-Bul'un RAG pipeline'ı şu adımlardan oluşmaktadır:

1. **Kategorizasyon:** Gelen soru anahtar kelime tabanlı olarak 14 hukuki kategoriden birine atanır.
2. **Sorgu Yeniden Yazma:** Groq API ile soru, vektör araması için optimize edilmiş bir forma dönüştürülür; hata durumunda orijinal soru kullanılır.
3. **Retrieval:** Yeniden yazılmış soru, embedding modeli (`intfloat/multilingual-e5-base`) ile vektöre dönüştürülür ve Qdrant Cloud'daki 75.789 hukuki chunk (66.755 Yargıtay kararı + 9.034 kanun maddesi) arasından en yakın parçalar getirilir.
4. **Reranking:** Getirilen parçalar, ilgililik skoruna göre yeniden sıralanır.
5. **Yanıt Üretimi:** Seçilen parçalar bağlam olarak eklenerek Groq API'den yanıt üretilir.

Düşük benzerlik skoruyla dönen sorgular (retrieval güveni yetersiz) ayrıca `weak_queries` tablosuna kaydedilir ve admin panelinden izlenebilir.

### 2.4 Vektör Veritabanları

Vektör veritabanları, metinlerin veya diğer veri türlerinin yüksek boyutlu sayısal temsilleri (embedding) üzerinde hızlı yakın komşu araması (nearest neighbor search) yapmak için tasarlanmış özel veritabanlarıdır. Geleneksel tam metin aramasından farklı olarak, anlamsal benzerliğe dayalı sonuçlar üretirler.

Bu projede **Qdrant Cloud** kullanılmaktadır. Qdrant, yüksek performanslı yakın komşu araması sunan açık kaynaklı bir vektör veritabanıdır. Sistemde 75.789 hukuki chunk (66.755 Yargıtay kararı + 9.034 kanun maddesi) bu veritabanında saklanmakta; Qdrant'a erişilememesi durumunda `backend/data/processed_backup_*/` altındaki 33 kanunun yerel JSON kopyasına fallback yapılmaktadır.

Embedding üretimi için `intfloat/multilingual-e5-base` modeli tercih edilmiştir; bu model Türkçe dahil çok sayıda dili desteklemekte ve semantik aramada yüksek başarı göstermektedir.

### 2.5 Türk Hukuk Sistemi — Kategori Yapısı

Türk hukuku, kıta Avrupası hukuk sistemini temel alır ve çeşitli alanları düzenleyen kanun ve yönetmeliklerden oluşur. Hak-Bul'un kategorizasyon sistemi, Türk hukukunun temel dallarını kapsayan 14 kategori üzerine inşa edilmiştir:

| # | Kategori |
|---|----------|
| 1 | İş Hukuku |
| 2 | Medeni Hukuk |
| 3 | Ceza Hukuku |
| 4 | Ticaret Hukuku |
| 5 | Tüketici Hukuku |
| 6 | Taşınmaz Mülkiyet Hukuku |
| 7 | İdare Hukuku |
| 8 | Vergi Hukuku |
| 9 | Sosyal Güvenlik Hukuku |
| 10 | Fikri Mülkiyet Hukuku |
| 11 | Bilişim Hukuku |
| 12 | Anayasa Hukuku |
| 13 | Usul Hukuku |
| 14 | Genel |

---

## Bölüm 3: Kullanılan Araçlar ve Teknolojiler

### 3.1 FastAPI

**FastAPI**, Python 3.11 ile geliştirilmiş modern, yüksek performanslı bir web framework'üdür. ASGI standardına dayanır ve asenkron istek işlemeyi destekler.

Bu projede FastAPI'nin tercih edilme nedenleri:
- Otomatik OpenAPI / Swagger dokümantasyonu (`http://localhost:8000/docs`)
- Python type hint'lere dayalı otomatik request/response doğrulaması (Pydantic)
- SSE (Server-Sent Events) desteği — streaming yanıt için zorunlu
- Async endpoint desteği — Qdrant ve Groq API çağrıları için

Projede 8 router dosyası üzerinden 77'den fazla endpoint sunulmaktadır. Uvicorn ASGI sunucusu kullanılarak çalıştırılmaktadır.

### 3.2 React 19 + Vite

Frontend, **React 19** bileşen mimarisi ve **Vite 7.3.1** build aracıyla geliştirilmiştir.

- **React 19:** Hook tabanlı fonksiyonel bileşenler, `useContext` ile global durum yönetimi (`DilContext`, auth state)
- **Vite:** Geliştirme ortamında HMR (Hot Module Replacement) desteği; üretim için optimize edilmiş bundle çıktısı
- **Tailwind CSS 3.4:** Utility-first CSS framework; tutarlı ve responsive tasarım
- **Axios 1.13.6:** HTTP client — API istekleri ve interceptor tabanlı token yönetimi
- **react-markdown 9.1.0:** LLM yanıtlarını Markdown olarak render etmek için
- **lucide-react 0.576.0:** Icon kütüphanesi

Frontend, 9 sayfa ve 9 bileşenden oluşmaktadır.

### 3.3 Groq API

**Groq**, LPU (Language Processing Unit) tabanlı özel donanım altyapısı üzerinden LLM çıkarım hizmeti sunan bir platformdur. Geleneksel GPU tabanlı çözümlere kıyasla çok daha düşük gecikme süreleri sağlar.

Bu projede kullanılan model: **Llama-3.3-70b-versatile**

- Türkçe dahil çok dilli metin anlama ve üretme
- 128k token bağlam penceresi
- SSE ile token bazlı streaming çıktı (`generate_answer_stream()`)
- Kritik konularda (ceza, boşanma, icra, tazminat, mültecilik) yanıt sonuna otomatik avukat yönlendirmesi eklenmesi (ALO 182)

### 3.4 Qdrant

**Qdrant**, Rust ile yazılmış yüksek performanslı açık kaynaklı bir vektör veritabanıdır. Bu projede **Qdrant Cloud** (yönetilen servis) kullanılmaktadır.

- **75.789 hukuki chunk** (66.755 Yargıtay kararı + 9.034 kanun maddesi) indekslenmiştir
- Embedding modeli: `intfloat/multilingual-e5-base` (768 boyutlu vektörler)
- Benzerlik ölçütü: kosinüs benzerliği
- Düşük skor eşiği (`SCORE_THRESHOLD`) altındaki sorgular `weak_queries` tablosuna loglanır
- Qdrant erişilemezse sistem `backend/data/processed_backup_*/` altındaki 33 kanunluk yerel JSON corpus'a fallback yapar

Embedding modeli, ilk Docker başlatmasında `model_data` volume'una indirilip önbelleğe alınmaktadır.

### 3.5 PostgreSQL + Alembic

**PostgreSQL 16** ilişkisel veritabanı olarak kullanılmaktadır. Docker ortamında `postgres:16-alpine` imajı, geliştirme ortamında ise host port `5433` üzerinden erişilmektedir.

**Alembic**, SQLAlchemy ORM ile entegre çalışan bir veritabanı migration aracıdır. Projede 9 sıralı migrasyon bulunmakta; migration zinciri şu tabloları oluşturmaktadır:

| Tablo | Açıklama |
|-------|----------|
| `users` | Kullanıcı hesapları (email, bcrypt hash, rol) |
| `refresh_tokens` | JWT refresh token yönetimi |
| `chat_history` | Sohbet mesajları (user/guest dual-mode) |
| `message_feedback` | Cevap puanlama (👍/👎) |
| `shared_conversations` | Sohbet paylaşım token'ları |
| `weak_queries` | Düşük güven skorlu sorgular |
| `forum_threads` | Forum başlıkları |
| `forum_replies` | Forum yanıtları |
| `forum_votes` | Forum oy kayıtları |

Şifre hashleme için **bcrypt 4.0.1** + **passlib 1.7.4** kullanılmaktadır.

### 3.6 Docker

Uygulama, **Docker Compose** ile üç servis olarak konteynerize edilmiştir:

| Servis | İmaj / Build | Port | Açıklama |
|--------|-------------|------|----------|
| `postgres` | `postgres:16-alpine` | 5433→5432 | İlişkisel veritabanı |
| `backend` | `./backend/dev-Dockerfile` | 8000 | FastAPI + Uvicorn |
| `frontend` | `./frontend/dev-Dockerfile` | 5173 | Vite dev server |

Servisler arasında sağlık kontrolleri (`healthcheck`) tanımlanmıştır; backend postgres sağlıklı olmadan, frontend ise backend sağlıklı olmadan başlamamaktadır. Backend konteynerı açılışta otomatik olarak `alembic upgrade head` komutunu çalıştırır.

**Docker volume'ları:**
- `postgres_data` — veritabanı kalıcılığı
- `model_data` — `intfloat/multilingual-e5-base` model önbelleği
- `frontend_node_modules` — npm bağımlılıkları

---

## Bölüm 4: Sistem Tasarımı ve İmplementasyon

### 4.1 Genel Sistem Mimarisi

Hak-Bul üç katmanlı bir mimari üzerine inşa edilmiştir:

```
[Kullanıcı Tarayıcısı]
        ↓ HTTP / SSE
[React 19 + Vite Frontend — port 5173]
        ↓ REST API çağrıları (Axios)
[FastAPI Backend — port 8000]
    ├── RAG Pipeline (Qdrant + Groq)
    ├── Auth (JWT)
    ├── PostgreSQL (SQLAlchemy + Alembic)
    └── Harici Servisler: Groq API, Qdrant Cloud
```

Frontend, tüm API isteklerini `VITE_API_URL` ortam değişkeniyle tanımlı backend adresine yönlendirir. Backend, `/ask/stream` endpoint'i üzerinden SSE protokolüyle token bazlı yanıt akışı sağlar.

### 4.2 RAG Pipeline Detayı

RAG pipeline'ı `backend/rag/pipeline.py` içindeki `run_pipeline(soru, max_kaynak)` fonksiyonu koordine eder. Bileşenler:

| Adım | Modül | Açıklama |
|------|-------|----------|
| 1. Kategorizasyon | `categorizer.py` | Anahtar kelime tabanlı, 14 kategori |
| 2. Sorgu Yeniden Yazma | `query_rewriter.py` | Groq API ile optimize; hata → orijinal soru |
| 3. Retrieval | `retriever.py` | Qdrant Cloud'dan chunk getirme; Qdrant yoksa yerel JSON fallback; düşük skor → `weak_queries` |
| 4. Reranking | `reranker.py` | Benzerlik skoruna göre yeniden sıralama |
| 5. Yanıt Üretimi | `generator.py` | Groq llama-3.3-70b-versatile; kritik konularda ALO 182 eklenir; `generate_answer_stream()` SSE desteği |

`/ask` endpoint'inin yanıt şeması:

```json
{
  "yanit": "...",
  "kaynaklar": [...],
  "conversation_id": "uuid",
  "guest_session_id": "uuid|null",
  "message_id": "uuid",
  "kategori": "İş Hukuku",
  "uyari": "..."
}
```

### 4.3 Kimlik Doğrulama Sistemi

Kimlik doğrulama `backend/auth/` modülü tarafından yönetilmektedir. JWT (JSON Web Token) tabanlı ve refresh token rotation mekanizması içermektedir:

- **Access token:** 30 dakika geçerlilik süresi
- **Refresh token:** 14 gün geçerlilik süresi, her yenilemede yeni token üretilir (rotation)
- **Kullanıcı rolleri:** `user` (standart), `lawyer` (avukat), `admin` (yönetici)
- **Dual-mode:** `get_current_user_optional` ile hem kimlik doğrulamalı hem misafir kullanıcılar desteklenir

Misafir kullanıcılar, `guest_session_id` (UUID) ile tanımlanır; bu değer frontend tarafından `localStorage`'da saklanır.

### 4.4 Veritabanı Tasarımı

**Tablo ilişkileri:**

- `chat_history`: `user_id` (auth) veya `guest_session_id` (misafir) — XOR constraint; `category` ve `metadata_json` kolonları; `deleted_at` ile soft-delete
- `message_feedback`: `message_id` FK → `chat_history.id`; `puan` CHECK constraint (1 veya -1); aynı kullanıcı/oturum tekrar oy verirse günceller
- `shared_conversations`: `share_token` (URL-safe, 24 byte), `is_active` flag
- `forum_threads`, `forum_replies`, `forum_votes`: forum içeriği ve oy mekanizması

**Migration zinciri:**

```
20260305_0001  → users, refresh_tokens
20260305_0002  → chat_history (guest desteği)
20260316_0003  → category kolonu
20260317_0004  → message_feedback tablosu
20260317_0005  → title kolonu
20260326_0006  → weak_queries, shared_conversations
20260326_0007  → chat_history.deleted_at (soft-delete)
20260330_0008  → lawyer rolü
20260330_0009  → forum tabloları
```

### 4.5 Frontend Yapısı

Frontend, `frontend/src/` altında sayfa ve bileşen ayrımıyla organize edilmiştir:

**Sayfalar (`pages/`):**

| Sayfa | Açıklama |
|-------|----------|
| `SohbetSayfasi.jsx` | Ana sohbet arayüzü |
| `LandingPage.jsx` | Açılış ekranı |
| `ProfilSayfasi.jsx` | Email/şifre güncelleme, hesap silme |
| `AdminSayfasi.jsx` | Admin analitik paneli |
| `ForumSayfasi.jsx` | Forum başlıkları listesi |
| `ForumBaslikSayfasi.jsx` | Forum başlık detayı ve yanıtlar |
| `KarsilastirmaSayfasi.jsx` | İki PDF karşılaştırma (drag-and-drop) |
| `TaslakSayfasi.jsx` | Hukuki belge şablonları |
| `PaylasimSayfasi.jsx` | Paylaşılan sohbet görüntüleme (hash-based routing) |

**Bileşenler (`components/`):**

`AuthModal`, `DirekArama`, `FeedbackButonlari`, `GecmisPanel`, `HukukiUyariModal`, `KaynakKarti`, `SohbetMesaji`, `YukleniyorGostergesi`, `AsistanBot`

**Global durum:**
- `DilContext.jsx`: Türkçe/İngilizce dil seçimi (`i18n/tr.js`, `i18n/en.js`)
- Custom hook `useChat.js`: SSE streaming, `conversation_id` ve `guest_session_id` yönetimi

---

## Bölüm 5: Özellikler ve API

### 5.1 Sohbet ve SSE Streaming

Kullanıcılar hem kimlik doğrulamalı hem de misafir olarak Türkçe hukuki sorular sorabilmektedir. Sohbet geçmişi backend'de saklanmakta; sohbet başlıkları ilk mesajdan otomatik oluşturulmaktadır.

| Endpoint | Açıklama |
|----------|----------|
| `POST /ask` | RAG pipeline — tam yanıt (rate: 20/dk) |
| `POST /ask/stream` | SSE — token bazlı yanıt akışı (rate: 20/dk) |
| `GET /chat/conversations` | Sohbet listesi |
| `DELETE /chat/conversations/{id}` | Sohbet sil |
| `PATCH /chat/conversations/{id}/title` | Başlık yeniden adlandır |
| `GET /chat/conversations/{id}/export` | PDF olarak dışa aktar |
| `POST /chat/conversations/{id}/share` | Paylaşım linki oluştur |
| `GET /chat/shared/{share_token}` | Herkese açık sohbet görüntüleme |

### 5.2 PDF Analizi ve Karşılaştırma

Kullanıcılar PDF belgelerini yükleyerek hukuki analiz yaptırabilmektedir.

| Endpoint | Açıklama |
|----------|----------|
| `POST /documents/analyze` | PDF yükle + soru sor (max 10 MB, 15k karakter truncation) |
| `POST /documents/compare` | İki PDF karşılaştır (rate: 5/dk) |

- Taranmış görüntü PDF'ler (metin çıkarılamayan) 400 hatası döndürür
- Analiz sonucu chat geçmişine `[PDF: dosya.pdf] soru` formatında kaydedilir

### 5.3 Forum

| Endpoint | Açıklama |
|----------|----------|
| `GET /forum/threads` | Başlıkları listele |
| `POST /forum/threads` | Başlık oluştur (auth gerekir) |
| `POST /forum/threads/{id}/replies` | Yanıt yaz |
| `PATCH /forum/threads/{id}/lock` | Başlığı kilitle/aç (`LAWYER`/`ADMIN`) |
| `PATCH /forum/replies/{id}/verify` | Yanıtı doğrula (`LAWYER`/`ADMIN`) |
| `POST /forum/threads/{id}/vote` | Başlığa oy ver |
| `POST /forum/replies/{id}/vote` | Yanıta oy ver |

### 5.4 Hukuki Belge Şablonları

| Endpoint | Açıklama |
|----------|----------|
| `GET /templates` | Mevcut şablonlar ve gerekli alanlar |
| `POST /templates/{id}/generate` | PDF belge üret ve indir |

Desteklenen şablonlar: `kira_sozlesmesi`, `is_sozlesmesi`, `ihtarname`, `taahhutname`

PDF çıktısı ReportLab kütüphanesiyle üretilmektedir.

### 5.5 Admin Paneli

Tüm endpoint'ler `ADMIN` rolü gerektirir.

| Endpoint | Açıklama |
|----------|----------|
| `GET /admin/stats` | Toplam kullanıcı, mesaj, sohbet, feedback |
| `GET /admin/stats/categories` | Kategori bazlı soru dağılımı |
| `GET /admin/stats/feedback` | 👍/👎 sayıları ve beğeni oranı |
| `GET /admin/stats/daily` | Günlük aktivite grafiği |
| `GET /admin/users` | Kullanıcı listesi |
| `PATCH /admin/users/{id}/role` | Rol güncelle |
| `PATCH /admin/users/{id}/status` | Aktif/pasif değiştir |
| `GET /admin/weak-queries` | Düşük güven skorlu sorgu listesi |

### 5.6 Sohbet Paylaşma ve Misafir Modu

- **Sohbet paylaşma:** `POST /chat/conversations/{id}/share` — URL-safe 24 byte token üretilir; `GET /chat/shared/{token}` ile kimlik doğrulama gerektirmeksizin salt okunur görüntüleme
- **Misafir modu:** `guest_session_id` localStorage'da saklanır; misafir sohbet geçmişi ayrı endpoint'lerden (`/chat/guest/*`) erişilir
- **Cevap puanlama:** `POST /feedback` — `message_id` + `puan` (1 veya -1); aynı kullanıcı/oturum tekrar oy verirse mevcut kayıt güncellenir

---

## Bölüm 6: Test ve Değerlendirme

### 6.1 Birim Test Sonuçları

Backend test paketi `backend/tests/` altında 16 dosya ve 64 testten oluşmaktadır. Tüm testler başarıyla geçmektedir.

Test kapsamı:

| Test Dosyası / Alan | Kapsanan Senaryolar |
|--------------------|---------------------|
| Auth akışı | Register, login, refresh token rotation, logout, profil güncelleme |
| Sohbet geçmişi | Guest ve user bazlı sohbet kaydetme ve listeleme |
| Feedback | Validasyon, 404 kontrolü, 👍/👎 kayıt ve güncelleme |
| PDF döküman servisi | Metin çıkarma, 10 MB boyut limiti, 15k karakter truncation |
| PDF analiz endpoint | DB kaydı, 400 hataları (taranmış görüntü PDF) |
| Belge şablonları | Liste, PDF üretimi, alan validasyonu |
| Admin analytics | Yetki kontrolleri, istatistik veri doğrulama |
| Forum | Endpoint ve rol kuralları (user/lawyer/admin) |
| Dil desteği | Türkçe/İngilizce i18n regresyonları |
| Streaming / source-summary | SSE yanıt ve kaynak özeti regresyonları |
| Production guard | Kritik konularda ALO 182 yönlendirmesi doğrulaması |
| Retrieval | RAG pipeline retrieval regresyonları |

### 6.2 100 Soruluk Sistem Testi

`docs/tests/` altında gerçek kullanıcı senaryolarına dayalı 100 soruluk bir sistem testi gerçekleştirilmiştir. Bu test; farklı hukuki kategorilerdeki soruları kapsayan, yanıt kalitesini ve kaynak tutarlılığını değerlendiren manuel bir değerlendirme sürecidir.

Test soru seti şu kategorileri kapsamaktadır: iş hukuku, ceza hukuku, kira hukuku, tüketici hukuku, aile hukuku ve boşanma, sosyal güvenlik.

### 6.3 Retrieval Baseline (Phase 4)

`docs/tests/retrieval-baseline-phase4.md` içinde Qdrant retrieval performansının ölçüldüğü baseline sonuçları belgelenmiştir. Bu ölçümler; getirilen chunk'ların soruyla ilgililik oranını ve `SCORE_THRESHOLD` parametresinin ayarlanması için kullanılan temel metrikleri içermektedir.

> **Not:** RAGAS tabanlı otomatik değerlendirme pipeline'ı (precision, recall, faithfulness metrikleri) gelecek çalışma olarak planlanmıştır.

---

## Bölüm 7: Sonuçlar ve Öneriler

### 7.1 Sonuçlar

Bu bitirme projesi kapsamında, Türk hukuku özelinde çalışan, kaynak gösterimli yanıt üretebilen ve kritik konularda kullanıcıyı profesyonel hukuki destek kanallarına yönlendirebilen bir yapay zeka destekli hukuk asistanı web uygulaması geliştirilmiş ve uçtan uca işlevsel hale getirilmiştir. Projenin somut çıktıları aşağıda özetlenmiştir.

**1. Çalışan RAG Pipeline**
Türk mevzuatından üretilen **75.789 hukuki chunk** (66.755 Yargıtay kararı + 9.034 kanun maddesi), `intfloat/multilingual-e5-base` embedding modeliyle (768 boyutlu vektörler) Qdrant Cloud üzerinde indekslenmiştir. Pipeline; (i) anahtar kelime tabanlı kategorizasyon (14 hukuki kategori), (ii) Groq API üzerinden sorgu yeniden yazımı, (iii) vektör retrieval, (iv) reranking ve (v) Llama-3.3-70b-versatile ile yanıt üretimi olmak üzere beş aşamadan oluşmaktadır. Qdrant erişiminin kesilmesi durumunda sistem, `backend/data/processed_backup_*/` altındaki **33 kanunluk yerel JSON corpus**'a otomatik fallback yapmaktadır.

**2. Güvenli Backend Altyapısı**
FastAPI üzerine kurulu REST API; JWT access token (30 dk) + refresh token rotation (14 gün), `user` / `lawyer` / `admin` rol tabanlı yetkilendirme, slowapi tabanlı rate limiting (örn. `/ask` için 20/dk, `/documents/compare` için 5/dk) ve dual-mode (kimlik doğrulamalı / misafir) erişim desteğiyle çalışmaktadır. PostgreSQL şeması, **10 sıralı Alembic migrasyonu** ile yönetilen 10 tablodan oluşmaktadır.

**3. Modern Frontend**
React 19 + Vite tabanlı SPA; **9 sayfa ve 8 ana bileşen** üzerine inşa edilmiştir. `DilContext` ile Türkçe/İngilizce çift dil desteği, `useChat` hook'u ile SSE üzerinden token bazlı yanıt akışı, hash-based routing ile kimlik doğrulama gerektirmeyen sohbet paylaşımı ve `localStorage` üzerinden misafir oturum kalıcılığı sağlanmıştır.

**4. Tamamlayıcı Özellikler**
Çekirdek soru-cevap akışına ek olarak; PDF belge analizi (10 MB sınır, 15k karakter truncation), iki PDF arasında karşılaştırma, ReportLab tabanlı hukuki belge şablonu üretimi (kira sözleşmesi, iş sözleşmesi, ihtarname, taahhütname), topluluk forumu (kullanıcı/avukat/admin rol kuralları, oy mekanizması) ve admin analitik paneli (kategori dağılımı, feedback oranı, günlük aktivite, zayıf sorgu izleme) sisteme entegre edilmiştir.

**5. Test Kapsamı**
Backend tarafında `backend/tests/` altında **17 test dosyasında 115 otomatik test** bulunmakta ve tamamı başarıyla geçmektedir. Bunlara ek olarak; 100 soruluk manuel sistem testi (kategori bazlı yanıt kalitesi ve kaynak tutarlılığı değerlendirmesi) ve `docs/tests/FAZ4_RETRIEVAL_BASELINE.md` altında belgelenen retrieval baseline ölçümleri yapılmıştır.

**6. Kritik Konularda Kullanıcı Yönlendirmesi**
Ceza, boşanma, icra, tazminat ve mültecilik gibi profesyonel hukuki destek gerektiren konular tespit edildiğinde; sistem yanıtın sonuna otomatik olarak Adalet Bakanlığı **ALO 182** hattı yönlendirmesi ekleyerek kullanıcıyı yetkili kanallara iletmektedir.

**7. Konteynerize Edilebilir Dağıtım**
Tüm sistem (PostgreSQL, FastAPI backend, React frontend) Docker Compose ile üç servisli, sağlık kontrolü zincirine sahip, tek komutla ayağa kaldırılabilen bir altyapı olarak paketlenmiştir.

### 7.2 Gelecek Çalışmalar

Projenin mevcut sürümü işlevsel olmakla birlikte, aşağıdaki başlıklar gelecek çalışma olarak planlanmıştır:

- **RAGAS Tabanlı Otomatik Değerlendirme:** Faithfulness, answer relevancy, context precision ve context recall metriklerini ölçen, Groq/Llama tabanlı bir değerlendirme pipeline'ının kurulması.
- **Production Deployment:** Frontend için Vercel, backend için Render veya Railway üzerinde canlı ortama alınması; özel alan adı ve HTTPS yapılandırılması.
- **Veri Seti Genişletme:** Mevcut **75.789 chunk**'lık corpus'un (66.755 Yargıtay kararı + 9.034 kanun maddesi), güncel kanun değişiklikleri ve yeni içtihat kararlarıyla zenginleştirilmesi; chunk-id tabanlı versiyonlama ile yeniden indeksleme akışının otomatikleştirilmesi.
- **Reranker Modeli Yükseltmesi:** Mevcut skor tabanlı reranking adımının, cross-encoder tabanlı (örn. `bge-reranker`) bir modelle değiştirilerek Türkçe sorgu-chunk eşleşme isabetinin artırılması.
- **Mobil Uyumluluk:** Responsive tasarımın mobile-first yaklaşımla yeniden ele alınması ve PWA desteğinin eklenmesi.
- **Demo Senaryosu ve Jüri Hazırlığı:** Gerçek kullanıcı senaryolarına dayalı uçtan uca demo akışının hazırlanması ve sunum materyallerinin tamamlanması.

---

## Kaynakça

1. Lewis, P., Perez, E., Piktus, A., Petroni, F., Karpukhin, V., Goyal, N., ... & Kiela, D. (2020). *Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks.* Advances in Neural Information Processing Systems (NeurIPS), 33, 9459–9474. arXiv:2005.11401.
2. Vaswani, A., Shazeer, N., Parmar, N., Uszkoreit, J., Jones, L., Gomez, A. N., Kaiser, Ł., & Polosukhin, I. (2017). *Attention Is All You Need.* Advances in Neural Information Processing Systems (NeurIPS), 30. arXiv:1706.03762.
3. Wang, L., Yang, N., Huang, X., Yang, L., Majumder, R., & Wei, F. (2022). *Text Embeddings by Weakly-Supervised Contrastive Pre-training.* arXiv:2212.03533. (intfloat/multilingual-e5-base)
4. Meta AI. (2024). *Introducing Llama 3.3.* https://ai.meta.com/blog/meta-llama-3/
5. Groq, Inc. (2024). *GroqCloud API Documentation.* https://console.groq.com/docs
6. Qdrant. (2024). *Qdrant — Vector Database Documentation.* https://qdrant.tech/documentation/
7. Es, S., James, J., Espinosa-Anke, L., & Schockaert, S. (2024). *RAGAS: Automated Evaluation of Retrieval Augmented Generation.* In Proceedings of the European Chapter of the Association for Computational Linguistics (EACL): System Demonstrations. arXiv:2309.15217.
8. FastAPI. (2024). *FastAPI — Modern, fast web framework for building APIs with Python 3.7+ based on standard Python type hints.* https://fastapi.tiangolo.com/
9. Pydantic. (2024). *Pydantic — Data validation using Python type hints.* https://docs.pydantic.dev/
10. React. (2024). *React 19 Documentation.* https://react.dev/
11. Vite. (2024). *Vite — Next Generation Frontend Tooling.* https://vitejs.dev/
12. Tailwind Labs. (2024). *Tailwind CSS v3.4 Documentation.* https://tailwindcss.com/docs
13. SQLAlchemy. (2024). *SQLAlchemy Documentation.* https://docs.sqlalchemy.org/
14. Bauer, M. (2024). *Alembic — Database Migration Tool for SQLAlchemy.* https://alembic.sqlalchemy.org/
15. PostgreSQL Global Development Group. (2024). *PostgreSQL 16 Documentation.* https://www.postgresql.org/docs/16/
16. Docker, Inc. (2024). *Docker Compose Documentation.* https://docs.docker.com/compose/
17. Internet Engineering Task Force (IETF). (2015). *RFC 7519 — JSON Web Token (JWT).* https://datatracker.ietf.org/doc/html/rfc7519
18. WHATWG. (2024). *HTML Living Standard — Server-Sent Events.* https://html.spec.whatwg.org/multipage/server-sent-events.html
19. Türkiye Cumhuriyeti Cumhurbaşkanlığı Mevzuat Bilgi Sistemi. *Mevzuat.gov.tr — Resmî Mevzuat Veritabanı.* https://www.mevzuat.gov.tr/
20. Yargıtay Başkanlığı. *Yargıtay Karar Arama Sistemi.* https://karararama.yargitay.gov.tr/
21. T.C. Adalet Bakanlığı. *ALO 182 Adalet Çağrı Merkezi.* https://alo182.adalet.gov.tr/
22. Susskind, R. (2019). *Online Courts and the Future of Justice.* Oxford University Press.
23. Ashley, K. D. (2017). *Artificial Intelligence and Legal Analytics: New Tools for Law Practice in the Digital Age.* Cambridge University Press.
24. Chalkidis, I., Fergadiotis, M., Malakasiotis, P., Aletras, N., & Androutsopoulos, I. (2020). *LEGAL-BERT: The Muppets straight out of Law School.* Findings of EMNLP 2020. arXiv:2010.02559.
