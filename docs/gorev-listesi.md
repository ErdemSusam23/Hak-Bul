# Hak-Bul — Görev Listesi

Son güncelleme: 2026-04-16

Bu belge tartışma amaçlıdır. İmplementasyon detayları burada yer almaz; her görev ayrıca planlanacak.

---

## Yüksek Öncelik

### ~~G0 — Retrieval Sorunu: Qdrant Devre Dışı, Local Fallback Çalışıyor~~ ✅ ÇÖZÜLDÜ

**Durum:** Çözüldü — sistem retrieval açısından tam çalışıyor.

**Çözüm özeti (Nisan 2026):**

- Embedding model `intfloat/multilingual-e5-base` olarak düzeltildi (önceki: yanlış model)
- Dual-collection yapısı kuruldu: `hukuk_chunks` (Yargıtay kararları) + `hukuk_chunks_v2` (kanunlar)
- `QDRANT_COLLECTION_KANUN` env var ile ikinci collection sorgulanıyor
- Local JSON fallback (`data/processed_backup_20260326/`) sadece Qdrant erişilemez olduğunda devreye giriyor
- Qdrant hatası artık loglanıyor (`logger.warning`)
- Retrieval@5_kanun baseline: **%67** (Faz 4, 15 Nisan 2026)

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

### ~~G3 — Reranker~~ ✅ UYGULAMAYA ALINDI

**Durum:** Tamamlandı — production'da aktif.

**Uygulama özeti (Nisan 2026):**

- Model: `BAAI/bge-reranker-v2-m3` (çok dilli CrossEncoder, Türkçe destekli)
- Dosya: `backend/rag/reranker.py` — lazy-load, ilk çağrıda indirilir (~270MB)
- Kontrol: `RERANKER_ENABLED=true/false` env var — `false` olduğunda sıfır ek maliyet
- Pipeline'daki yeri: `apply_category_penalty` → **`rerank_chunks`** → `filter_by_score`
- Skor davranışı: Cross-encoder sıralama için kullanılır, `skor` alanı Qdrant cosine similarity'yi korur
- Retrieval@5_kanun_madde baseline: **%32** (Faz 4, 15 Nisan 2026)

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

Genel Değerlendirme

  Güncel yapıda bu işin zorluğu orta. Sebep şu: auth ve guest ayrımı zaten var, /ask ve /ask/stream giriş noktaları da
  net; ama kota kavramı veri modelinde hiç yok ve soru üretimi birkaç endpoint’e dağılmış durumda. Yani sıfırdan auth
  yazmıyorsunuz, fakat “tek yerde çalışan, guest + free user + streaming + PDF analizi” kuralını kurmak için küçük bir
  refactor gerekiyor.

  En gerçekçi tahmin:

  - Sadece backend enforcement, sabit kotalar, kullanıcıya basit hata mesajı: 1.5 - 3 gün
  - Buna admin görünürlüğü, profilde kalan kota bilgisi, daha temiz domain modeli ve testlerin tamamı eklenirse: 3 - 5
    gün
  - İleride premium/abonelik/billing de gelecekse, şimdi doğru tasarlanmazsa sonradan ikinci refactor gerekir.

  Nereler Etkilenir

  Ana giriş noktaları şu dosyalarda:

  - backend/main.py:99 ve backend/main.py:176: /ask ve /ask/stream burada. Kota kontrolü için en doğal yer burası.
  - backend/routers/documents.py:42 ve backend/routers/documents.py:145: PDF analiz/karşılaştırma da aynı tüketim
    modeline dahil edilecek mi burada karar verilmeli.
  - backend/auth/dependencies.py:31: get_current_user_optional guest/free ayrımını resolve etmek için zaten
    kullanılıyor. Kota dependency’si buraya benzer bir ortak katman olarak eklenebilir.
  - backend/models/user.py:11: kullanıcıda şu an sadece role, is_active gibi alanlar var; free/premium tier veya
    override quota bilgisi yok.
  - backend/services/chat_service.py:20: chat kayıtları burada yapılıyor. Kota sayımı için burayı kullanmak mümkün ama
    doğru yer değil; kota mantığı ayrı servis olmalı.
  - backend/config.py: günlük/aylık limitler config’den yönetilmeli.
  - frontend/src/hooks/useChat.js:157 ve frontend/src/hooks/useChat.js:309: stream akışı ve 429 hata gösterimi burada;
    kota doldu mesajı UI’da burada ele alınır.
  - frontend/src/api/client.js:121 ve frontend/src/api/client.js:135: /ask ve /documents/analyze çağrıları.
  - frontend/src/api/client.js:288 ve frontend/src/pages/ProfilSayfasi.jsx: kalan kota profil ekranında gösterilecekse
    burası etkilenir.

  Refactor İhtiyacı

  Asıl refactor ihtiyacı şu noktada: şu an rate limit IP bazlı slowapi ile endpoint üzerinde duruyor, iş kuralı bazlı
  “bu kullanıcı bugün kaç soru sordu” mantığı ise hiç yok. Yani kota için ikinci bir katman gerekiyor. Bunu endpoint
  içine gömmek mümkün ama kötü olur; ortak bir quota_service veya dependency yazmak daha doğru.

  Önerilen yapı:

  - users tablosuna plan/tier alanı eklemek: örn. plan = guest/free/premium ya da auth user için free/premium
  - Ayrı bir kullanım tablosu eklemek: örn. usage_events veya quota_usage
  - Ortak bir servis: check_and_consume_quota(actor, action_type)
  - /ask, /ask/stream, gerekirse /documents/analyze bu servisi çağırır
  - Yanıtta opsiyonel kota bilgisi dönülür: remaining_daily, remaining_monthly, reset_at

  Bu refactor küçük-orta ölçekli. Çünkü şu an domain mantığı router’larda duruyor; yeni kota kuralı bunu biraz daha
  servis katmanına çekmeyi gerektirir.

  Maliyet Kırılımı

  Backend:

  - DB migration: 0.5 gün
  - quota modeli/servisi: 0.5 - 1 gün
  - /ask + /ask/stream entegrasyonu: 0.5 gün
  - /documents/analyze ve diğer soru-benzeri uçlar için karar ve entegrasyon: 0.25 - 0.5 gün
  - hata sözleşmesi ve response genişletme: 0.25 gün
  - testler: 0.5 - 1 gün

  Frontend:

  - mevcut 429 akışını kota-dolu mesajına uyarlama: 0.25 gün
  - profil veya chat ekranında kalan kota göstergesi: 0.5 gün
  - i18n metinleri ve edge-case’ler: 0.25 gün

  Toplam:

  - Minimum uygulanabilir sürüm: 2 - 3 gün
  - Daha temiz ve büyümeye uygun sürüm: 3 - 5 gün

  Başlıca Riskler

  - Guest kullanıcı sayımı IP’ye göre yapılırsa hatalı olur; sizde guest cookie/session altyapısı var, bunu kullanmak
    daha doğru.
  - Streaming’de kota ne zaman düşecek sorusu kritik. İstek başında mı, ilk token’da mı, tamamlanınca mı? En pratik
    çözüm istek başında reserve etmek.
  - Sadece chat_history sayarak kota hesaplamak kısa vadede çalışır ama uzun vadede sorun çıkarır; silinen sohbetler,
    başarısız istekler, belge analizi ve farklı action tipleri karışır.
  - role şu an sadece user/admin; premium’ı role’a sıkıştırmak kötü tasarım olur. Plan/tier ayrı alan olmalı.
  - Profil ekranında kota gösterecekseniz yeni endpoint veya profile response genişletmesi gerekir.

  Sonuç

  Bugünkü mimaride bu iş yapılabilir ve bloklayıcı bir mimari sorun yok. Zorluk seviyesi orta; ana maliyet auth’tan
  değil, doğru quota domain modelini kurmaktan geliyor. En önemli karar da şu: bunu sadece “429 benzeri basit sayaç” mı
  yapacaksınız, yoksa yarın premium/billing bağlanabilecek şekilde mi tasarlayacaksınız. İlkini hızlı çıkarırsınız,
  ikincisi için küçük ama doğru bir refactor şart.

  İsterseniz bir sonraki adımda size doğrudan:

  1. önerilen tablo şemasını,
  2. endpoint sözleşmesini,
  3. sprint/task breakdown’ını
     çıkarayım.

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
