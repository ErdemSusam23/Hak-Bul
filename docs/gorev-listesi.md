# Hak-Bul — Görev Listesi

Son güncelleme: 2026-03-27

Bu belge tartışma amaçlıdır. İmplementasyon detayları burada yer almaz; her görev ayrıca planlanacak.

---

## Yüksek Öncelik

### G0 — Retrieval Sorunu: Qdrant Devre Dışı, Local Fallback Çalışıyor ⚠️

**Durum:** Aktif hata — sistem retrieval açısından bozuk çalışıyor.

**Belirtiler:**
- Sorgulara dönen tüm kaynaklar aynı skoru gösteriyor (örnek: hepsi %87)
- Qdrant'tan veri çekilemiyor

**Neden oluyor — adım adım:**

Sistem iki farklı retrieval yöntemi biliyor: Qdrant vektör araması ve local keyword araması. Qdrant çalışmadığında ya da hata verdiğinde `retriever.py` sessizce local aramaya geçiyor. Sorun şu ki local arama için gereken JSON dosyaları da yok.

```
retrieve_chunks() çağrılır
    │
    ├─ Qdrant'a bağlan, embedding üret, sorgu at
    │       │
    │       └─ HATA (bağlantı, API key, koleksiyon adı, model boyutu vb.)
    │               ↓
    │           except bloğu: sessizce local aramaya geç
    │               ↓
    │           data/processed/ klasörüne bak
    │               ↓
    │           KLASÖR BOŞ → hiç chunk yok
    │               ↓
    │           fallback: skor=0.01 ile rastgele chunk döndür
    │
    └─ Sonuç: tüm kaynaklar aynı (yapay) skoru taşıyor
```

**Qdrant hatası neden görünmüyor?**

`retriever.py` satır 591'deki `except Exception:` bloğu herhangi bir hatayı yakaladığında log'a hiçbir şey yazmadan local aramaya geçiyor. Dolayısıyla Qdrant neden çalışmadığı log'lara yansımıyor.

**Muhtemel Qdrant hata nedenleri (hangisi olduğu bilinmiyor):**

| Olası Neden | Nasıl Kontrol Edilir |
|---|---|
| `QDRANT_URL` veya `QDRANT_API_KEY` `.env`'de boş/yanlış | `.env` dosyasına bak |
| Embedding modeli yüklenemiyor (`intfloat/multilingual-e5-base` ~500MB) | Docker container'da `model_data` volume mount'u kontrol et |
| Qdrant koleksiyonundaki vektör boyutu ile embedding modeli boyutu uyuşmuyor | Qdrant Cloud dashboard'dan koleksiyon boyutuna bak (768 olmalı) |
| `QDRANT_COLLECTION` adı yanlış | Dashboard'da koleksiyon adını kontrol et |

**İkincil sorun — Local fallback da kırık:**

`data/processed/` klasörü boş. 33 kanunun JSON dosyaları `data/processed_backup_20260326/` altında duruyor ama kod `processed/` klasörüne bakıyor. Klasör adı uyuşmazlığından dolayı Qdrant düşse bile local fallback çalışmıyor.

**Çözüm için yapılması gerekenler:**

1. Qdrant hatasının nedenini tespit et (yukarıdaki kontroller)
2. Qdrant düzelene kadar local fallback'i çalışır hale getirmek için `processed_backup_20260326/` klasörünü `processed/` olarak yeniden adlandır
3. `retriever.py`'daki `except Exception:` bloğuna hata loglama ekle — böylece bir dahaki seferde sorun görünür olur

**Bağımlılık:** Bu görev bitmeden G1 (RAGAS) ve G2 (Multi-turn RAG) çalıştırılamaz; retrieval bozukken kalite ölçümü anlamsız.

---

### G1 — RAGAS Evaluation Pipeline

**Ne?**
Sistemin RAG kalitesini otomatik olarak ölçen değerlendirme altyapısı. Jüriye "doğruluk oranımız X" diyebilmek için somut metrik üretir.

**Ölçülecek metrikler:**
- **Faithfulness** — LLM'nin kaynakta olmayan bilgi üretip üretmediği
- **Answer Relevancy** — Yanıtın soruyu gerçekten karşılayıp karşılamadığı
- **Context Recall** — Doğru chunk'ların getirilip getirilmediği

**Gereksinimler:**
- 30–50 soru-cevap çifti hazırlanmalı (kısmen manuel, kısmen LLM-assisted)
- `ragas` Python kütüphanesi entegre edilmeli
- Sonuçlar raporlanabilir formatta çıkmalı (tablo veya grafik)

**Açık sorular:**
- Soru setini kim hazırlıyor? Hukuki doğruluk kontrolü gerekiyor.
- Tek seferlik mi çalıştırılacak, yoksa CI/CD'e mi bağlanacak?

---

### G2 — Çok Turlu Bağlamsal Yanıt (Multi-turn RAG)

**Ne?**
Şu an her soru bağımsız işleniyor; sistem önceki mesajları bilmiyor. Bu görevde pipeline'a önceki sohbet geçmişi bağlamı eklenir.

**Beklenen davranış:**
- "Önceki yanıtı daha detaylı anlat" → sistem önceki konuyu biliyor
- "Peki ya kıdem tazminatı için şart nedir?" → konu bağlamı korunuyor
- Yeni bir konuya geçildiğinde bağlam doğal olarak tazeleniyor

**Gereksinimler:**
- `conversation_id` ile DB'den son N mesajın çekilmesi
- `generate_answer()` fonksiyonuna `chat_history` parametresi eklenmesi
- Bağlam penceresi uzunluğunun (kaç önceki mesaj?) belirlenmesi

**Açık sorular:**
- Son kaç mesaj bağlama eklenecek? (Token limiti gözetilmeli)
- Misafir kullanıcılar için de aktif mi olacak?

---

### G3 — Reranker

**Ne?**
Qdrant'tan gelen top-5 chunk'u ikinci bir modelle yeniden sıralama. Şu an sadece embedding cosine similarity var; reranker semantic uyumu daha hassas değerlendirir.

**Beklenen iyileşme:**
- Yanlış chunk'ların LLM'e gönderilmesi azalır
- Retrieval kalitesi artar → faithfulness skoru iyileşir

**Gereksinimler:**
- Cross-encoder model seçimi ve entegrasyonu
- Mevcut `pipeline.py`'daki modüler yapıya eklenmesi (yer zaten ayrılmış)
- Reranker öncesi/sonrası karşılaştırmalı test

**Açık sorular:**
- Hangi cross-encoder modeli kullanılacak? (multilingual destek önemli)
- Reranker latency'si kabul edilebilir mi? (p95 < 10s hedefini etkilemez mi?)

---

## Orta Öncelik

### G4 — Güven Seviyesi Gösterimi

**Ne?**
Her yanıtta retrieval güven seviyesini kullanıcıya gösterme. Mevcut `weak_queries` loglama altyapısının frontend karşılığı.

**Kararlaştırılan:** Sayısal % yerine kategorik etiket gösterilecek.

**Önerilen etiket skalası:**

| Skor Aralığı | Etiket |
|---|---|
| `>= 0.85` | Çok Yüksek |
| `0.75 – 0.85` | Yüksek |
| `0.65 – 0.75` | Orta |
| `< 0.65` | Düşük |

*(Eşik değerleri gerçek veri dağılımına göre ayarlanmalı)*

**Gereksinimler:**
- Backend'in `max_skor` değerini yanıt ile döndürmesi (veya `guven_seviyesi` alanı eklenmesi)
- Frontend'de kaynak listesinin yanında veya yanıt başlığında görsel badge

**Açık sorular:**
- "Düşük güven" uyarısı kullanıcıyı gereksiz yere endişelendiriyor mu? Nasıl bir kopywrite kullanılacak?
- Misafir ve kayıtlı kullanıcılara aynı şekilde mi gösterilecek?

---

### G5 — LLM Tabanlı Kategori Tespiti (Fallback)

**Durum:** Ertelenmiş — yakın vadede yapılmayacak.

**Not:** Mevcut keyword tabanlı sistem çoğu durumda yeterli çalışıyor. Zaman kalırsa G9 ve G10'dan önce değerlendirilebilir.

---

## Düşük Öncelik (Zaman Kalırsa)

### G9 — Freemium Kota Sistemi

**Ne?**
Misafir ve ücretsiz kayıtlı kullanıcılar için günlük/aylık soru kotası. Auth sistemi ve `users` tablosu zaten hazır, middleware entegrasyonu gerekiyor.

**Bağımlılık:** Yüksek öncelikli görevler bitmeden başlanmayacak.

---

### G10 — Email Bildirimleri

**Ne?**
Kayıt onayı ve şifre sıfırlama email akışları.

**Not:** Deployment sonrasında daha anlamlı; Render.com üzerinde SMTP entegrasyonu ile yapılabilir.

**Bağımlılık:** Önce production deployment tamamlanmalı.

---

## Kapsam Dışı (Bu Sürüm)

| Özellik | Gerekçe |
|---|---|
| İlgili soru önerileri | Kapsam dışı bırakıldı |
| Tam metin kaynak görüntüleme | Kaynak linkleri yeterli |
| Hybrid search (BM25 + vektör) | Akademik değer var ama zaman kısıtı |
| Mobil uygulama / PWA | MVP sonrası |
| Danıştay kararları | Teknik karmaşıklık |

---

## Açık Kalan Sorular (Tüm Görevler İçin)

1. **RAGAS soru seti:** Kim hazırlıyor, hukuki doğrulama süreci nasıl işleyecek?
2. **G3 Reranker modeli:** Türkçe destekleyen, performans/hız dengesi iyi hangi model?
3. **Deployment zamanlaması:** Yüksek öncelikli görevler bitmeden deploy mu yoksa paralel mi?
4. **Jüri tarihi:** Kesin tarih netleşince G1 evaluation seti hazırlama zamanlaması buna göre kurgulanmalı.
