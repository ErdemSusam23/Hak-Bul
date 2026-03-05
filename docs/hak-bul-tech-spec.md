# 🏛️ HakBul
**Technical Specification**
`v0.3 — Bitirme Projesi`

---

## 1. Proje Kapsamı

Vatandaşların günlük Türkçe ile sordukları hukuki sorulara, Mevzuat.gov.tr ve Yargıtay kararlarını kaynak alarak otomatik yanıt üreten RAG tabanlı web uygulaması. Sistem bilgi sunma konumunda çalışır; hukuki danışmanlık iddiasında bulunmaz.

### 1.1 Hedef Kitle
- Hukuki bilgiye ihtiyaç duyan vatandaşlar
- Temel hukuki süreçleri anlamak isteyen bireyler

### 1.2 Kapsam Dışı
- Fine-tune / model eğitimi
- Danıştay kararları *(teknik karmaşıklık ve HTML parse güçlüğü nedeniyle MVP dışı)*
- Lokal/offline çalışma modu
- Mobil uygulama *(MVP sonrası değerlendirilebilir)*
- Freemium kota sistemi *(MVP sonrası, aşağıya bkz.)*

---

## 2. Gereksinimler

### 2.1 Fonksiyonel Gereksinimler
- Kullanıcı günlük Türkçe ile hukuki soru sorabilmeli
- Sistem ilgili kanun maddelerini ve Yargıtay kararlarını vektör arama ile bulmalı
- Yanıt kaynak atıflarıyla birlikte üretilmeli (hangi kanun, hangi madde, hangi karar)
- Kullanıcı kanun maddesi numarası veya dava numarasıyla direkt arama yapabilmeli
- Her yanıtta "Bu bir hukuki tavsiye değildir" uyarısı gösterilmeli
- Kullanıcıdan ilk girişte sorumluluk reddi onayı alınmalı (checkbox / açılış ekranı)
- MVP'de auth/kota yok; ilerleyen fazda freemium model değerlendirilecek

### 2.2 Fonksiyonel Olmayan Gereksinimler
- Yanıt süresi: p95 < 10 saniye
- Türkçe hukuk terminolojisini doğru işleyebilme
- Kaynak atıflarının doğrulanabilir olması (kanun adı + madde numarası)
- Sistem %80 retrieval doğruluk hedefi *(ölçüm planı için bkz. Bölüm 7)*

---

## 3. Veri Katmanı

### 3.1 Veri Kaynakları
- **Mevzuat.gov.tr** — kanun, yönetmelik, tebliğ
- **Yargıtay kararları** — emsal.yargitay.gov.tr üzerinden HTML parse *(PDF'e göre parse çok daha kolay)*
- Başlangıç noktası olarak GitHub / HuggingFace Türkçe hukuki veri setleri değerlendirilecek

#### MVP Kapsamındaki Hukuk Alanı
| Alan | Durum |
|------|-------|
| **İş Hukuku** | ✅ MVP — tek alan ile başlanır |
| Kira Hukuku | 🔜 Sonraki faz |
| Tüketici Hukuku | 🔜 Sonraki faz |

> **Karar gerekçesi:** RAG pipeline kalitesi alan sayısından bağımsız. Sistem tek alanda sağlam çalıştıktan sonra diğer alanlar eklenir. İş Hukuku tercih sebebi: Yargıtay kararı bol, kullanıcı soruları net (kıdem, ihbar), jüri de konuya hakimdir.

#### MVP Veri Hacmi Hedefi
| İçerik | Hedef | Gerekçe |
|--------|-------|---------|
| Kanun | 3-5 kanun | 4857 İş K. + Borçlar K. + SGK K. çekirdek oluşturur |
| Yargıtay kararı | 500-1.000 karar | Qdrant free tier (1GB) için güvenli sınır |
| Tahmini chunk sayısı | ~3.000-5.000 | Free tier için rahat |

#### Veri Toplama Yöntemi
- Mevzuat.gov.tr için önce resmi XML/indirme yolu denenir; çalışmazsa scraping uygulanır.
- Yargıtay kararları için HTML format tercih edilir.

### 3.2 Chunking Stratejisi
- Token sayısına göre kör bölme **yapılmaz**; madde sınırları temel alınır
- **Kanun metinleri:** madde bazlı chunking; çok uzun maddelerde fıkra bazında bölme
- **Yargıtay kararları:** özet, gerekçe ve sonuç ayrı chunk'lara ayrılır; tamamına aynı `karar_no` metadata'sı eklenir
- Önceki maddeye referans veren durumlarda sliding window — overlap token değil, madde sınırlarıyla yapılır
- LangChain `RecursiveCharacterTextSplitter` separator listesi Türk hukuk metnine özelleştirilir

### 3.3 Zorunlu Metadata Alanları
| Alan | Açıklama |
|------|----------|
| `kaynak_turu` | `kanun` / `yonetmelik` / `yargitay_karari` |
| `kanun_adi` | Örn: "4857 Sayılı İş Kanunu" |
| `madde_no` | Örn: "Madde 17" |
| `karar_no` | Yargıtay kararları için |
| `hukuk_alani` | Örn: "is_hukuku" |
| `yil` | Yürürlük / karar yılı |
| `url` | Resmi kaynak bağlantısı (örn. mevzuat veya karar arama linki), yoksa `null` |

---

## 4. Teknik Mimari

### 4.1 RAG Pipeline

Sistem çekirdeği **saf RAG** olarak kurulur. Ajan karmaşıklığına baştan girilmez. Pipeline **reranker eklenmeye hazır** şekilde modüler tasarlanır.

```
Kullanıcı sorusu
      │
      ▼
[Query Rewriting]      ← Groq API → llama-3.1-8b-instant
      │
      ▼
[Vektör Arama top-5]   ← Qdrant Cloud
      │
      ▼
[Skor Eşiği Filtresi]  ← Düşük skorlu chunk'lar elenir
      │
      ▼
[Reranker]             ← Opsiyonel, modüler — MVP sonrası
      │
      ▼
[Yanıt Üretme]         ← Groq API → llama-3.3-70b-versatile
      │
      ▼
Kaynak atıflı yanıt + "Bu bir hukuki tavsiye değildir" uyarısı
```

> **Groq API nedir?** Groq, Llama gibi açık kaynak modelleri bulutta çok hızlı çalıştıran bir API servisidir. Sistemde hiçbir model local çalışmaz; tüm LLM istekleri Groq'un sunucularına gider. OpenAI API kullanımıyla aynı mantık, farklı platform.

### 4.2 Teknoloji Kararları

| Katman | Teknoloji | Gerekçe |
|--------|-----------|---------|
| Backend | FastAPI (Python) | LangChain entegrasyonu kolay, async destek |
| Frontend | React | Hızlı geliştirme |
| Vektör DB | Qdrant Cloud | Free tier 1GB, Türkçe desteği iyi |
| LLM | Groq API | Hız + ücretsiz tier, tamamen cloud |
| Embedding | `sentence-transformers` | Türkçe destekli model mevcut |
| Orchestration | LangChain | RAG pipeline yönetimi |

### 4.3 Groq API Kullanım Noktaları

| Görev | Groq Model | Gerekçe |
|-------|-----------|---------|
| Query Rewriting | `llama-3.1-8b-instant` | Basit görev, hızlı, ücretsiz tier yeterli |
| Yanıt Üretme | `llama-3.3-70b-versatile` | Türkçe hukuk terminolojisi için kalite gerekli |

> **Groq Free Tier Limitleri:** Dakikada 30 istek, günde 14.400 istek — geliştirme için fazlasıyla yeterli.

### 4.4 Retrieval Parametreleri

| Parametre | Değer | Gerekçe |
|-----------|-------|---------|
| top-N | 5 | top-3'te Türkçe query-chunk uyumsuzluğunda doğru chunk kaçabiliyor |
| Skor eşiği | Test ile belirlenecek | Düşük güven chunk'larını elemek için |

---

## 5. Deployment

### 5.1 Seçenek A — Sıfır Maliyet (Geliştirme / Demo)

| Bileşen | Platform | Maliyet |
|---------|----------|---------|
| Frontend | Vercel | $0 |
| Backend | Render.com / Railway | $0 |
| Vektör DB | Qdrant Cloud free tier | $0 |
| LLM | Groq API free tier | $0 |

> ⚠️ Render free tier cold start sorunu: 10 dakikada bir ping atan basit cron job ile çözülür.

### 5.2 Seçenek B — AWS Credits (Jüri Sunumu / Production)

| Bileşen | Platform | Tahmini Maliyet |
|---------|----------|-----------------|
| Frontend | S3 + CloudFront | ~$1/ay |
| Backend | EC2 t3.small | ~$15-20/ay |
| Vektör DB | Qdrant Cloud free tier | $0 |
| LLM | Groq API free tier | $0 |

> **Tavsiye:** Geliştirme Seçenek A ile yapılır. Jüri öncesinde gerekirse AWS'e taşınır. Mimari aynı olduğu için taşıma ~1 günlük iş. LLM her iki senaryoda da Groq API — değişen hiçbir şey yok.

---

## 6. İş Modeli

- MVP'de auth/kota sistemi **yok** — scope dışı bırakıldı
- İlerleyen fazda: Freemium model (aylık soru kotası, PostgreSQL + middleware ile kota takibi)
- Reklam yok; Avukatlık Kanunu kapsamında tavsiye sınırları gözetilir

---

## 7. Değerlendirme (Evaluation)

### Hedef
Retrieval doğruluğu: **%80**

### Evaluation Seti Oluşturma
- **20-30 soru:** Ekip tarafından manuel hazırlanır (kıdem tazminatı, ihbar süresi, fazla mesai gibi gerçek senaryolar)
- **30-70 soru:** RAGAS ile LLM-assisted üretim, ardından ekip tarafından kontrol
- **Toplam hedef:** ~50-100 soru-cevap çifti

### Metrikler (RAGAS Kütüphanesi)
| Metrik | Açıklama |
|--------|----------|
| Faithfulness | Yanıt retrieved chunk'larla çelişiyor mu? |
| Answer Relevancy | Yanıt soruyu karşılıyor mu? |
| Context Recall | Doğru chunk'lar getiriliyor mu? |

### Zamanlama
- Evaluation seti hazırlama: Sistem ilk çalışır hale gelince başlanır
- Sorumlu: **TBD** *(ekipte hukuk bilgisi en güçlü kişi)*

---

## 8. Etik & Yasal Sınırlar

- Sistem bilgi sunma konumundadır; hukuki danışmanlık iddiasında bulunmaz
- Her yanıta **"Bu bir hukuki tavsiye değildir"** sorumluluk reddi beyanı eklenir — hem UI'da gösterilir hem system prompt'a işlenir
- Kullanıcıdan ilk girişte sorumluluk reddi onayı alınır (checkbox)
- Avukatlık Kanunu kapsamında reklam ve tavsiye sınırları gözetilir
- Groq API kullanıldığında kullanıcı verileri Groq ToS kapsamına girer — kullanıcıya bildirim yapılacak
- Avukatlık Kanunu uyumu için üniversite hukuk fakültesinden görüş alınacak *(TBD)*

---

## 9. Açık Kararlar

| # | Konu | Durum |
|---|------|-------|
| 9.1 | Skor eşiği değeri (retrieval filtresi) | ❓ Test ile belirlenecek |
| 9.2 | Reranker eklenecek mi? (cross-encoder) | ⏸️ MVP sonrası — pipeline hazır |
| 9.3 | Evaluation seti sorumlusu ve tamamlanma tarihi | ❓ Açık |
| 9.4 | Avukatlık Kanunu için hukuk fakültesinden görüş | ❓ Açık |

> Bu doküman canlı tutulur. Kararlar netleştikçe Bölüm 9 güncellenir.

---

*Son güncelleme: v0.3 — Veri hacmi hedefi, Groq API mimarisi, retrieval parametreleri, evaluation planı ve etik sınırlar netleştirildi.*
