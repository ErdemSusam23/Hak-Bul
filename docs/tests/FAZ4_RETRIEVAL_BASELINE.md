# Faz 4 — Retrieval Baseline Altyapısı

> **Tarih:** 15 Nisan 2026  
> **Branch:** test/erdem  
> **Durum:** Tamamlandı

---

## 1. Ne Yaptık?

Faz 4'te hiçbir RAG bileşenine dokunmadan, mevcut sistemin retrieval kalitesini **ölçebildiğimiz** bir altyapı kurduk. Dört şey değişti:

### 1.1 Soru şeması genişletildi

`test_sorular/*/sorular.json` dosyaları düz string listesinden zengin dict formatına geçirildi:

```json
{
  "İş Hukuku": [
    {
      "soru": "İşten çıkarıldım, kıdem ve ihbar tazminatımı hangi şartlarda alabilirim?",
      "beklened_kanunlar": ["1475", "4857"],
      "beklenen_maddeler": ["14", "17"],
      "notlar": "Kıdem: 1475 m.14; ihbar: 4857 m.17"
    }
  ]
}
```

Her soruya iki alan eklendi:
- `beklenen_kanunlar` — Bu sorunun cevabı için hangi kanunun gelmesi gerekiyor?
- `beklenen_maddeler` — Hangi madde numarası o kanunun içinde olmalı?

Eski string formatı hâlâ destekleniyor (geriye dönük uyumluluk).

### 1.2 Test runner dict formatını anlıyor

`test_api_otomatik.py` içindeki `sorulari_yuk()` fonksiyonu hem eski `"Soru metni"` hem yeni `{"soru": "...", ...}` formatını kabul ediyor. Yeni alanlar test çalıştırmasını etkilemiyor, sadece değerlendirme sırasında kullanılıyor.

### 1.3 Evaluator scripti yazıldı

`backend/scripts/evaluate_retrieval.py` — API'ye tek bir istek atmadan, mevcut `test_sonuclari_*.json` dosyaları üzerinden çalışıyor.

Ne yapıyor:
1. `test_sonuclari_*.json` içindeki her sorunun `kaynaklar[]` listesini okuyor
2. `baslik` alanından kanun numarasını (`^\d{3,4} Sayılı`) ve madde numarasını (`Madde \d+`) regex ile çıkarıyor
3. Bunları `beklenen_kanunlar` / `beklenen_maddeler` ile karşılaştırıyor
4. İki metrik üretiyor: `retrieval@5_kanun` ve `retrieval@5_kanun_madde`

### 1.4 Baseline raporu üretildi

`backend/test_results/baseline_retrieval_20260415.md` ve `.json` — Faz 1/2/3 sonrası iyileşmeyi bu sayılara kıyasla ölçeceğiz.

---

## 2. Bu Altyapı Bize Ne Sağlıyor?

### Ölçüm olmadan iyileştirme olmaz

Faz 4'ten önce retrieval kalitesini manuel analiz ediyorduk: test çalıştır → JSON'u Claude'a ver → Claude yorumlasın. Bu yavaş, özneldi ve fazlar arasında karşılaştırma imkânı yoktu.

Şimdi tek komutla nesnel ölçüm var:

```bash
python scripts/evaluate_retrieval.py --all
# → retrieval@5_kanun: 22/48 (45.8%)
```

### İki farklı kalite boyutunu ayrıştırıyor

| Metrik | Sorusu | Faz ile ilgisi |
|---|---|---|
| `retrieval@5_kanun` | Doğru kanun geliyor mu? | Faz 2 (whitelisting) bunu iyileştirecek |
| `retrieval@5_kanun_madde` | Doğru madde geliyor mu? | Faz 3 (reranker) bunu iyileştirecek |

Kanun doğruysa ama madde yanlışsa → kanun keşfi iyi, madde granülaritesi zayıf demektir. Farklı çözümler gerektiren farklı sorunlardır.

### Corpus boşluklarını görünür kılıyor

Corpus'ta olmayan kanunlar (5352 Adli Sicil, 6458 Yabancılar, 5901 Vatandaşlık, 6735 Çalışma İzni...) için beklenen değerleri yine de yazdık. Evaluator bunları `miss` olarak raporluyor. Bu sayede:
- Faz 2'de hangi kanunları corpus'a eklemek gerektiği netleşiyor
- Corpus eksikliğinden kaynaklanan başarısızlık ile embedding zayıflığından kaynaklanan başarısızlık ayrışıyor

### Post-hoc çalışıyor — test süresini uzatmıyor

Evaluator, API'ye istek atmıyor. Mevcut JSON dosyaları üzerinde saniyeler içinde çalışıyor. Yeni test çalıştırmak zorunda değilsiniz; geçmiş sonuçları da değerlendirebilirsiniz.

---

## 3. Ne Zaman Kullanılmalı?

### Her faz değişikliğinden sonra

Faz 1/2/3 uygulandıktan ve testler yeniden çalıştırıldıktan sonra:

```bash
python scripts/evaluate_retrieval.py --all \
  --out test_results/faz1_sonrasi_retrieval.md \
  --json-out test_results/faz1_sonrasi_retrieval.json
```

Baseline ile karşılaştırın: `retrieval@5_kanun` artı mı, eksi mi?

### Yeni sorular eklendiğinde

`sorular.json`'a yeni sorular eklerseniz, `beklenen_kanunlar` alanını doldurun. Evaluator bir sonraki çalışmada otomatik dâhil eder.

### Corpus genişletildiğinde

Yeni kanunlar Qdrant'a yüklendiğinde, testleri yeniden çalıştırın ve evaluator'ı çalıştırın. Corpus eklemesinin hangi soruları iyileştirdiği net görünür.

### Rutin kontrol

Test runner zaten düzenli çalışıyorsa (CI veya manuel), evaluator her seferinde otomatik çalıştırılabilir. Baseline'dan belirli bir sapma tetikleyici olarak kullanılabilir.

---

## 4. Baseline Sonuçları ve Çıkarımlar

### Sayılar

| Kategori | retrieval@5_kanun | retrieval@5_kanun_madde | Ort. Skor |
|---|---|---|---|
| İş Hukuku | **0/12 — %0** | 0/9 — %0 | 0.68 |
| Ceza Hukuku | 9/12 — %75 | 4/12 — %33 | 0.86 |
| Usul Hukuku | 9/12 — %75 | 1/11 — %9 | 0.95 |
| Genel Hukuk | 4/12 — %33 | 1/6 — %17 | 0.90 |
| **Toplam** | **22/48 — %46** | **6/38 — %16** | — |

### Bulgu 1 — İş Hukuku tamamen çökmüş

Tüm 12 soruda sıfır kanun isabeti. Beklenen 4857 İş Kanunu ve 1475 Kıdem gelmiyor; yerine **4734 Kamu İhale Kanunu**, 6102 TTK, 193 GVK gibi tamamen alakasız kanunlar geliyor.

**Neden:** Embedding modeli "işçi hakları" semantiğini kamu ihale mevzuatından ayırt edemiyor. Aynı kelime dağarcığından beslenen metinler birbirine yakın vektörler üretiyor.

**Faz 2 çözümü:** İş Hukuku kategorisine gelen sorgularda 4857/1475 dışı kanunları soft penalty ile aşağıya çek.

### Bulgu 2 — Ceza Hukuku en iyi, ama madde isabeti hâlâ zayıf

TCK (5237) 9/12 soruda geliyor — iyi. Ancak doğru madde yalnızca 4/12'de geliyor.

Örnek: S1 hakaret (m.125/131 bekleniyor) → m.75 geliyor. S2 tehdit (m.106 bekleniyor) → m.51, m.84, m.11 geliyor. Doğru kanun, yanlış bölüm.

**Neden:** Qdrant chunk'ları madde bazında bölünmüş; ama sorgu "hakaret" deyince madde m.125 yerine "ceza" genel bağlamındaki daha popüler maddeler öne çıkıyor.

**Faz 3 çözümü:** Cross-encoder reranker top-20'yi alıp soru-madde uyumuna göre yeniden sıralasın.

### Bulgu 3 — Usul'de kanun doğru, madde neredeyse hiç yok

2004 (İİK) ve 6100 (HMK) kanunları geliyor (%75), ama madde isabeti %9 — 11 sorudan 1'i.

Örnek: S10 delil tespiti (HMK m.400-405 bekleniyor) → m.183, m.375, m.108 geliyor. m.183/A yaygın bir halüsinasyon; gerçekte delil tespiti m.400'de.

**Neden:** Chunk'lar doğru kanundan ama alakasız bölümlerden; embedding genel kanun yakınlığını iyi yapıyor, spesifik madde eşleşmesini yapamıyor.

**Faz 3 çözümü:** Reranker bu madde-spesifik ayrımı çözecek.

### Bulgu 4 — Genel Hukuk'ta corpus eksiklikleri belirleyici

4/12 kanun isabeti. Başarısızlıkların büyük çoğunluğu corpus'ta hiç olmayan kanunlardan geliyor:
- 5352 Adli Sicil → yok
- 6458 Yabancılar → yok
- 5901 Vatandaşlık → yok
- 6735 Çalışma İzni → yok
- 4982 Bilgi Edinme → yok
- 3071 Dilekçe → yok

**Faz 2 çözümü:** Bu kanunları corpus'a ekle. Evaluator, ekleme sonrası hangi soruların düzeldiğini otomatik gösterecek.

### Bulgu 5 — Skor yüksek olması isabeti garantilemiyor

Usul Hukuku ortalama skor **0.95** — en yüksek. Ama retrieval@5_kanun_madde yalnızca %9.

Bu, daha önce tespit ettiğimiz temel sorunun kanıtı: skor normalizasyonu (Faz 1 hedefi) skoru anlamsız kılıyor. 0.95 alan kaynak da, 0.65 alan kaynak da aynı ölçekte görünüyor; ikincisi aslında alakasız olabilir.

---

## 5. Sonraki Adımlar

Bu baseline Faz 1/2/3 için ölçüm referansı. Hedef sayılar:

| Metrik | Baseline | Faz 1+2 Hedef | Faz 1+2+3 Hedef |
|---|---|---|---|
| retrieval@5_kanun | %46 | %70+ | %80+ |
| retrieval@5_kanun_madde | %16 | %30+ | %55+ |

**Faz 1 (skor şeffaflığı):** `pipeline.py` ve `retriever.py` içindeki normalizasyon kaldırılır → skoru tekrar güvenilir hâle getir.

**Faz 2 (kategori whitelisting):** `KATEGORI_EXPECTED_LAWS` dict ekle, kategori→kanun soft penalty uygula, corpus'a eksik kanunları ekle.

**Faz 3 (reranker):** `bge-reranker-v2-m3` cross-encoder ile top-20'yi yeniden sırala → madde isabetini iyileştir.

Her fazdan sonra:
```bash
python scripts/evaluate_retrieval.py --all
```
komutu ile ilerlemeyi ölç ve bu tabloya kayıt düş.
