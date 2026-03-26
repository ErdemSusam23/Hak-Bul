# 🏛️ Türk Hukuk Asistanı — Sprint Planı
`v1.1 — 4 Kişi / 8 Hafta`

---

## Ekip Rolleri

| Kod | İsim | Sorumluluk Alanı |
|-----|------|-----------------|
| **A** | Erdem | RAG pipeline + backend + gerektiğinde frontend |
| **B** | Yağız | Veri toplama, chunking, embedding, evaluation + backend destek |
| **C** | Mustafa | Veri toplama, chunking, embedding, evaluation + frontend destek |
| **D** | Ömer | Frontend + deployment + API entegrasyonu |

---

## Genel Zaman Çizelgesi

```
Hafta 1-2  │ Temel kurulum & veri toplama
Hafta 3-4  │ RAG pipeline çekirdeği
Hafta 5-6  │ Backend API + Frontend
Hafta 7    │ Evaluation & iyileştirme
Hafta 8    │ Deployment + jüri hazırlığı
```

---

## Sprint 1 — Hafta 1-2: Kurulum & Veri Toplama

**Hedef:** Çalışan bir scraper + temiz veri seti + proje altyapısı hazır olsun.

### Görevler

| Görev | Sorumlu |
|-------|---------|
| GitHub repo kurulumu, branch stratejisi, klasör yapısı | Erdem |
| Groq API key alma, Qdrant Cloud hesabı açma | Erdem |
| Mevzuat.gov.tr XML/resmi indirme yolu araştırma | Yağız |
| Yargıtay HTML scraper yazma (BeautifulSoup) | Yağız + Mustafa |
| Scraping öğrenme: BeautifulSoup + requests temelleri | Yağız + Mustafa |
| İndirilen ham veriyi temizleme & normalize etme | Mustafa |
| Frontend proje iskeleti kurma (React + Vite) | Ömer |
| FastAPI proje iskeleti kurma | Erdem |

### Sprint Sonu Çıktısı
- [x] 3-5 kanun temiz metin olarak elde edildi
- [x] 500+ Yargıtay kararı HTML'den parse edildi
- [x] Ham veri `/data/raw` klasöründe düzenli halde

> ⚠️ **Risk:** Scraping sıfırdan öğreniliyor. Mevzuat.gov.tr XML çalışırsa Yağız 1 hafta kazanır, çalışmazsa scraping yazılır — bu yüzden Yağız ve Mustafa paralel araştırır.

---

## Sprint 2 — Hafta 3-4: RAG Pipeline Çekirdeği

**Hedef:** Soru sor → ilgili chunk'lar gelsin → yanıt üretilsin. Kaba da olsa uçtan uca çalışsın.

### Görevler

| Görev | Sorumlu |
|-------|---------|
| Chunking pipeline yazma (madde bazlı) | Erdem + Yağız |
| Metadata şeması uygulama (kaynak_turu, madde_no vb.) | Yağız |
| Embedding modeli seçme & test etme (sentence-transformers) | Mustafa |
| Qdrant koleksiyonu oluşturma & vektör yükleme | Erdem + Mustafa |
| Groq API entegrasyonu — query rewriting (8B) | Erdem |
| Groq API entegrasyonu — yanıt üretme (70B) | Erdem |
| LangChain RAG zinciri kurma (uçtan uca ilk versiyon) | Erdem |
| Frontend sohbet arayüzü — temel chat UI | Ömer |

### Sprint Sonu Çıktısı
- [x] Terminalde: soru yaz → chunk'lar gelsin → yanıt üretilsin
- [x] Groq API her iki noktada çalışıyor
- [x] Qdrant'ta vektörler yüklü

> ⚠️ **Risk:** Chunking beklenenden uzun sürebilir. Madde regex'leri Türk hukuk metni formatına göre ayarlanmalı — Yağız ve Mustafa ham veriyle erken tanışmış olacak, bu avantaj.

---

## Sprint 3 — Hafta 5-6: Backend API + Frontend Entegrasyonu

**Hedef:** Frontend ile backend konuşsun. Kullanıcı arayüzden soru sorabilsin, kaynak atıflı yanıt görebilsin.

### Görevler

| Görev | Sorumlu |
|-------|---------|
| FastAPI endpoint yazma (`POST /ask`) | Erdem |
| Kaynak atıf formatı tasarlama (yanıtta hangi kanun/madde gösterilecek) | Erdem + Yağız |
| "Bu bir hukuki tavsiye değildir" uyarısı — backend'den frontend'e | Erdem |
| Backend yük fazlalaşırsa destek | Yağız |
| Frontend ↔ Backend API bağlantısı | Ömer |
| Kaynak atıflarını UI'da gösterme (tıklanabilir madde referansı) | Ömer |
| Sorumluluk reddi onay ekranı (checkbox, ilk giriş) | Ömer |
| Direkt madde/dava no arama özelliği | Erdem + Ömer |
| Frontend yük fazlalaşırsa destek | Mustafa |
| Hata yönetimi (Groq timeout, Qdrant hatası vb.) | Erdem |
| Evaluation seti oluşturmaya başlama (20-30 manuel soru) | Yağız + Mustafa |

### Sprint Sonu Çıktısı
- [x] Tarayıcıdan soru sorulabiliyor
- [x] Yanıt + kaynak atıfı ekranda görünüyor
- [x] Sorumluluk reddi ekranı çalışıyor
- [ ] 20-30 manuel evaluation sorusu hazır

---

## Sprint 4 — Hafta 7: Evaluation & İyileştirme

**Hedef:** Sistemi ölç, zayıf noktaları bul, düzelt.

### Görevler

| Görev | Sorumlu |
|-------|---------|
| RAGAS kurulumu & evaluation pipeline | Yağız + Mustafa |
| LLM-assisted soru üretimi (30-70 soru) + kontrol | Yağız + Mustafa |
| Faithfulness / Answer Relevancy / Context Recall ölçümü | Yağız + Mustafa |
| Zayıf sonuçları analiz etme (chunking mi, retrieval mi, prompt mu?) | Erdem + Yağız + Mustafa |
| Prompt iyileştirme (system prompt, query rewriting kalitesi) | Erdem |
| Chunking/retrieval düzeltmeleri (gerekirse) | Erdem + Yağız |
| UI polish — mobil uyumluluk, loading state, hata mesajları | Ömer + Mustafa |

### Sprint Sonu Çıktısı
- [ ] RAGAS skoru ölçüldü (hedef: %80)
- [ ] En az 1 iterasyon iyileştirme yapıldı
- [x] UI demo'ya hazır hissettiriyor

---

## Sprint 5 — Hafta 8: Deployment + Jüri Hazırlığı

**Hedef:** Sistem canlıda çalışsın, jüri demo'su sorunsuz geçsin.

### Görevler

| Görev | Sorumlu |
|-------|---------|
| Vercel'e frontend deploy | Ömer |
| Render/Railway'e backend deploy | Erdem + Ömer |
| Ortam değişkenleri (Groq API key, Qdrant URL) production'a taşıma | Erdem |
| Cold start cron job kurma (Render için) | Ömer |
| Uçtan uca production testi | Herkes |
| Jüri demo senaryosu hazırlama (3-5 örnek soru) | Herkes |
| Yedek plan: sistem çökerse ekran kaydı hazır olsun | Erdem + Ömer |
| Teknik doküman & sunum finalize | Herkes |

### Sprint Sonu Çıktısı
- [ ] Sistem production'da çalışıyor
- [ ] Demo senaryosu hazır ve prova edildi
- [ ] Yedek ekran kaydı var

---

## Kritik Bağımlılıklar

```
Veri Toplama — Yağız + Mustafa (S1)
    └─► Chunking & Embedding — Erdem + Yağız + Mustafa (S2)
              └─► RAG Pipeline — Erdem (S2)
                      └─► Backend API — Erdem + Yağız (S3)
                                └─► Evaluation — Yağız + Mustafa (S4)
                                          └─► Deploy — Erdem + Ömer (S5)

Frontend — Ömer + Mustafa (S1'de başlar, S3'te bağlanır)
```

> Veri toplama gecikirse her şey geriye kayar. **Hafta 1-2 en kritik sprint.**

---

## Riskler & Önlemler

| Risk | Olasılık | Önlem |
|------|----------|-------|
| Scraping öğrenme süreci uzar | Yüksek | Yağız + Mustafa paralel çalışır; Mevzuat XML çalışırsa Yargıtay'a odaklanılır |
| Erdem darboğaz olur (pipeline + backend) | Orta | Sprint 3'te Yağız backend'e destek verir |
| Groq free tier rate limit | Orta | Geliştirmede mock response kullan, gerçek API'yi az çağır |
| %80 hedefi tutmaz | Orta | Hafta 7'de prompt + chunking iterasyonu için tampon bırakıldı |
| Canlı demo'da sistem yavaş | Düşük | Groq çok hızlı; Render cold start cron job ile çözülür |

---

*Sprint planı canlı tutulur. Her sprint sonunda güncellenir.*