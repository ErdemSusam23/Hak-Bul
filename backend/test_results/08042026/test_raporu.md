# Hak-Bul API Test Sonuçları — Detaylı Analiz Raporu

**Test Tarihi:** 2026-04-08 13:31:12 UTC
**Test Dosyası:** `test_results/test_sonuclari_20260408_132317.json`
**Soru Havuzu:** `test_sorular_demo.json` (50 soru, 10 kategori)
**API URL:** `http://127.0.0.1:8000`

---

## 1. Genel İstatistikler

| Metrik | Değer |
|---|---|
| Toplam Soru | 50 |
| Başarılı | 47 |
| Başarısız | 3 |
| Başarı Oranı | **%94** |
| Toplam Süre | 475.2 saniye (~8 dk) |
| Ortalama Soru Süresi | **9.5 saniye** |

---

## 2. Kategori Bazlı Dağılım

| Kategori | Toplam | Başarılı | Başarısız | Başarı Oranı | Ort. Süre |
|---|---|---|---|---|---|
| İş Hukuku | 5 | 5 | 0 | %100 | 5.63s |
| Kira Hukuku | 5 | 5 | 0 | %100 | 1.82s |
| Tüketici Hukuku | 5 | 5 | 0 | %100 | 6.35s |
| Aile Hukuku | 5 | 5 | 0 | %100 | 2.40s |
| Ceza Hukuku | 5 | 5 | 0 | %100 | 9.14s |
| İdare Hukuku | 5 | 5 | 0 | %100 | 7.71s |
| Ticaret Hukuku | 5 | 5 | 0 | %100 | 5.53s |
| Vergi Hukuku | 5 | 5 | 0 | %100 | 5.61s |
| Sosyal Güvenlik Hukuku | 5 | 5 | 0 | %100 | 7.54s |
| **Genel Hukuk** | 5 | 2 | 3 | **%40** | 7.46s |

> **Dikkat:** Tüm başarısızlıklar "Genel Hukuk" kategorisinde yoğunlaşmış. Diğer 9 kategori %100 başarı oranına sahip.

---

## 3. Başarısız Sorular (3 Adet)

Üç soru da aynı hatayla başarısız oldu — hepsi **HTTP 503: upstream_unavailable**. Bu, Groq API'nin geçici olarak erişilemez olduğunu gösteriyor. Sorular testin en sonunda (sıra 48-50) geldiği için rate limit veya Groq API kotası aşılmış olabilir.

| Sıra | Soru | Beklenen Kategori | Hata | Süre |
|---|---|---|---|---|
| 48 | "Hak düşürücü süre nedir?" | Genel Hukuk | HTTP 503: upstream_unavailable | 0.57s |
| 49 | "Zamanaşımı ne demektir?" | Genel Hukuk | HTTP 503: upstream_unavailable | 0.38s |
| 50 | "Yargılama süreci ne kadar sürer?" | Genel Hukuk | HTTP 503: upstream_unavailable | 0.59s |

---

## 4. Kategori Tespit Doğruluğu

Toplam **26/50 (%52)** doğru kategori tespiti.

### Doğru Tespit Edilenler (26)
- **İş Hukuku:** 3/5 (2 soru "Genel Hukuk" olarak yanlış tespit edildi)
- **Kira Hukuku:** 5/5 ✅
- **Tüketici Hukuku:** 5/5 ✅
- **Aile Hukuku:** 5/5 ✅
- **Ceza Hukuku:** 5/5 ✅
- **İdare Hukuku:** 5/5 ✅
- **Ticaret Hukuku:** 2/5 (3 soru "Genel Hukuk" olarak yanlış tespit edildi)
- **Vergi Hukuku:** 5/5 ✅
- **Sosyal Güvenlik Hukuku:** 3/5 (2 soru "İş Hukuku" olarak yanlış tespit edildi)
- **Genel Hukuk:** 1/5 (4 soru diğer kategorilere kaydı)

### Yanlış Tespitler

| Sıra | Soru | Beklenen | Bulunan |
|---|---|---|---|
| 1 | "İşten haksız çıkarılırsam..." | İş Hukuku | Genel Hukuk |
| 2 | "Kıdem tazminatı nasıl hesaplanır?" | İş Hukuku | İş Hukuku ✅ |
| 3 | "Fazla mesai ücreti ne kadar ödenir?" | İş Hukuku | Genel Hukuk |
| 32 | "İflas davası nasıl açılır?" | Ticaret Hukuku | Genel Hukuk |
| 35 | "İcra takibi nasıl başlatılır?" | Ticaret Hukuku | Genel Hukuk |
| 42 | "İşsizlik maaşı nasıl alınır?" | Sosyal Güvenlik | İş Hukuku |
| 43 | "Malullük aylığı nedir?" | Sosyal Güvenlik | İş Hukuku |
| 46 | "Arabuluculuk nedir?" | Genel Hukuk | İş Hukuku |

> **Analiz:** Keyword-based categorizer, genel kavramlarla ilgili sorularda yetersiz kalıyor. "İş Hukuku" ile "Genel Hukuk" arasındaki ayrım net değil. "İflas", "icra" gibi kelimeler kategoride tanımlı olsa da bazı sorular Genel Hukuk'a kayıyor.

---

## 5. Kaynak Kalitesi Analizi

### Genel Özellikler
- Her başarılı yanıt **tam 5 kaynak** döndürüyor (sabit top-5)
- **Ortalama kaynak skoru:** ~0.84 (yüksek)
- **Kaynak türü dağılımı:** Soruya göre değişiyor, bazıları tamamen kanun, bazıları tamamen Yargıtay kararı

### Sorunlu Kaynak Örnekleri

**❌ Soru 9 (Depozito iadesi):**
5 Yargıtay kararı dönmüş ama metinler sadece `"davalıya iadesine, Dosyanın mahkemeye gönderilmesine..."` şeklinde. Depozito ile ilgisi olmayan genel mahkeme karar sonları. Embedding'ler "iade" kelimesine eşleşmiş ama içerik alakasız.

**❌ Soru 17 (Velayet hakkı):**
5 Yargıtay kararı dönmüş, hepsinin metni sadece `"e oy birliğiyle karar verildi."` — **anlamsız**. Embedding'ler "velayet" kelimesiyle eşleşmiş ama içerik boş.

**❌ Soru 36 (Gelir vergisi beyannamesi):**
5 Yargıtay kararı dönmüş ama metinler vergiyle hiç ilgisi olmayan İş Hukuku kararlarının sonları (`"erilmesine, 30.04.2025 tarihinde oy birliğiyle karar verildi."`).

**❌ Soru 15 (Tüketici hakem heyeti):**
5 Yargıtay kararı dönmüş ama tümü İş Hukuku davaları (OHAL komisyonu, sendika üyeliği vb.). Tüketici hukukuyla hiç ilgisi yok.

**❌ Soru 37 (KDV oranları):**
Kaynakların hepsi İş Hukuku (696 sayılı KHK kadro sorunu). KDV ile hiç ilgisi yok. LLM kendi bilgisiyle KDV oranlarını söylemiş ama kaynaklar desteklemiyor.

---

## 6. Yanıt Kalitesi Gözlemleri

### ✅ İyi Yanıtlar

| Soru | Gözlem |
|---|---|
| **Kıdem tazminatı** (Soru 2) | 4857 İş Kanunu md. 112'yi doğru referans alıyor. Kaynaklar doğru ve ilgili. |
| **Boşanma davası** (Soru 16) | 4721 TMK md. 167, 162, 184'ü doğru kullanmış. Kapsamlı ve doğru bilgi. |
| **Limited şirket** (Soru 31) | 6102 TTK md. 585, 580'i doğru referans almış. |
| **İşsizlik maaşı** (Soru 42) | 4447 sayılı kanunun 50. maddesini detaylı ve doğru aktarmış. 600/900/1080 gün eşikleri doğru. |

### ❌ Sorunlu Yanıtlar

| Soru | Sorun | Detay |
|---|---|---|
| **İşten haksız çıkarma** (1) | **İngilizce karışık** | `"several haklara sahip olabilirsiniz"`, `"learnmenizrecommended"` — LLM kod karışımı yapıyor |
| **Mobbing** (4) | **Anlamsız kelime** | `"severalımlarınız vardır"` — metin üretiminde tutarsızlık |
| **Depozito** (9) | **Yanlış bilgi** | Depozito hukukuyla ilgili hiçbir şey söylemiyor. Kaynaklar anlamsız mahkeme karar sonları. |
| **Ayıplı ürün** (11) | **Alakasız kaynaklar** | "Sebepsiz zenginleşme" ve "yatırım aracı" gibi alakasız Yargıtay kararları. Temel tüketici hakları (14 gün cayma, 2 yıl garanti) verilmemiş. |
| **Gelir vergisi** (36) | **İlgisiz kaynaklar** | Kaynaklar tamamen İş Hukuku. LLM kendi bilgisiyle doğru yanıt vermiş ama kaynaklar desteklemiyor — **doğrulanamayan bilgi**. |
| **KDV oranları** (37) | **Kaynak yetersiz** | LLM açıkça `"Kaynaklarda KDV oranlarına ilişkin bilgi bulunmamaktadır"` diyor. Retrieval failure. |
| **Stopaj vergisi** (40) | **Tamamen alakasız** | Kaynaklar trafik kazası tazminatı davalarına ait. LLM kendi bilgisiyle doğru tanım yapmış ama kaynaklar alakasız. |

### ⚠️ Halüsinasyon Riski

LLM, kaynaklar yetersiz veya ilgisiz olduğunda **kendi eğitim bilgisini** kullanarak yanıt üretiyor. Bu bazı durumlarda doğru sonuç verse de (stopaj tanımı, KDV bilgisi), doğrulanamayan bilgiler içermesi ciddi bir risk taşıyor — özellikle hukuki bağlamda.

---

## 7. Performans Analizi

### Süre Dağılımı (Başarılı Sorular)

| Metrik | Değer |
|---|---|
| En Hızlı | **0.89s** (Soru 6: "Ev sahibinin kira artışı") |
| En Yavaş | **19.24s** (Soru 1: "İşten haksız çıkarma") |
| Medyan | ~5.5s |
| Ortalama | 9.5s |

### Süre Aralıkları

| Aralık | Soru Sayısı | Yorum |
|---|---|---|
| 0-2s | 8 | Çoğu Kira, Aile, Ticaret soruları — hızlı embedding eşleşmesi |
| 2-6s | 17 | Normal aralık |
| 6-10s | 13 | Kabul edilebilir |
| 10-15s | 7 | Yavaş ama kabul edilebilir |
| 15s+ | 2 | Anormal yavaş — cold start veya ağır sorgular |

> **Gözlem:** İlk soru (19.24s) anormal derecede yavaş — muhtemelen model yükleme veya ilk istek **cold start**. Sonraki sorular 1-3 saniyeye düşüyor.

---

## 8. Tespit Edilen Sorunlar ve Öneriler

### 🔴 Kritik

| # | Sorun | Etki | Öneri |
|---|---|---|---|
| **BUG-1** | **Depozito sorusu yanlış bilgi** | Kullanıcıya yanlış yönlendirme | Retriever'da "depozito/teminat" ile ilgili doğru kanun maddelerinin (TBK md. 342) vector DB'ye eklendiği kontrol edilmeli |
| **BUG-2** | **Velayet sorusu — boş kaynaklar** | 5 kaynak dönmüş ama hepsi "oy birliğiyle karar verildi" | Corpus'ten kısa/standart metinler temizlenmeli veya minimum metin uzunluğu filtresi eklenmeli |
| **BUG-3** | **HTTP 503 — test sonu başarısızlıklar** | Son 3 soru yanıtsız | Groq API rate limit veya kota kontrol edilmeli. Test aralığı 4sn → 6sn artırılabilir |

### 🟡 Orta Önem

| # | Sorun | Etki | Öneri |
|---|---|---|---|
| **BUG-4** | **İlgisiz kaynaklar** (Soru 15, 36, 37, 40) | Tüketici sorusuna İş Hukuku, vergi sorusuna İş Hukuku kaynakları | Embedding modeli hukuk alanında yetersiz olabilir. Reranker veya domain-specific embedding değerlendirilmeli |
| **BUG-5** | **Kod karışımı** (Soru 1, 4) | Yanıtlarda İngilizce kelimeler: "several haklar", "learnmenizrecommended" | System prompt'ta Türkçe yanıt zorunluluğu güçlendirilmeli |
| **BUG-6** | **Kategori tespit zayıflığı** | %52 doğruluk oranı | Keyword-based categorizer'a ağırlıklandırma veya ML-based yaklaşım düşünülmeli |

### 🟢 Düşük Önem

| # | Sorun | Öneri |
|---|---|---|
| Sabit 5 kaynak | Her soru için tam 5 kaynak dönüyor. Dinamik kaynak sayısı değerlendirilebilir |
| Yargıtay kararı sonları | Birçok Yargıtay karar metni sadece "oy birliğiyle karar verildi" şeklinde bitiyor. Corpus'ten temizlenmeli |

---

## 9. Özet ve Sonraki Adımlar

Sistem genel olarak **%94 başarı oranı** ile iyi çalışıyor. Ancak 3 kritik alan iyileştirme gerektiriyor:

1. **Retrieval kalitesi** — İlgisiz/boş kaynaklar ciddi bir sorun. Embedding modeli veya corpus gözden geçirilmeli.
2. **LLM dil tutarlılığı** — System prompt güçlendirilmeli, Türkçe yanıt zorunluluğu netleştirilmeli.
3. **API stabilitesi** — HTTP 503 hataları Groq API rate limiting açısından izlenmeli.

### Öncelikli Aksiyonlar

| Öncelik | Aksiyon | Sorumlu |
|---|---|---|
| 🔴 1 | Yargıtay kararı corpus'ünü temizle (boş/standart metinler) | — |
| 🔴 2 | Depozito/teminat chunk'larını vector DB'ye ekle | — |
| 🟡 3 | System prompt'u Türkçe zorunluluğu ile güçlendir | — |
| 🟡 4 | Categorizer keyword ağırlıklarını gözden geçir | — |
| 🟢 5 | Test bekleme süresini 4sn → 6sn artır | — |
