# 🧪 Hak-Bul Test Sistemi

## Klasör Yapısı

```
test_sorular/
├── 01_is_hukuku/sorular.json          ← Bu klasöre 12 soru yaz
│   └── legacy/sorular_20260414.json   ← Önceki aktif set arşivi
├── 02_medeni_hukuk/sorular.json
├── 03_ceza_hukuku/sorular.json
└── ... (14 kategori)

test_results/
├── 01_is_hukuku/
│   └── test_sonuclari_20260409_150000.json   ← Test otomatik buraya kaydeder
├── 02_medeni_hukuk/
│   └── test_sonuclari_20260409_151500.json
└── ... (14 kategori)
```

## Soru Dosyası Formatı

`test_sorular/XX_kategori_adi/sorular.json`:

**Yeni format** (beklenen kanun/madde ile — önerilen):

```json
{
  "İş Hukuku": [
    {
      "soru": "İşten haksız çıkarılırsam hangi haklarımı alırım?",
      "beklenen_kanunlar": ["1475", "4857"],
      "beklenen_maddeler": ["14", "17"],
      "notlar": "Kıdem: 1475 m.14; ihbar: 4857 m.17"
    },
    {
      "soru": "Kıdem tazminatı nasıl hesaplanır?",
      "beklened_kanunlar": ["1475"],
      "beklenen_maddeler": ["14"],
      "notlar": "Son brüt ücret × kıdem yılı."
    }
  ]
}
```

**Eski format** (sadece soru dizisi — geriye dönük desteklenir):

```json
{
  "İş Hukuku": [
    "İşten haksız çıkarılırsam hangi haklarımı alırım?",
    "Kıdem tazminatı nasıl hesaplanır?"
  ]
}
```

**Alan semantiği:**
- `beklenen_kanunlar`: Kanun numaraları listesi. Top-5'te en az biri varsa "kanun hit" sayılır.
- `beklenen_maddeler`: Madde numaraları (opsiyonel). Beklenen kanun + madde aynı chunk'ta mı → "madde hit".
- `notlar`: İnsan için açıklama, metrik hesabına girmez.

> **Önemli:** JSON dosyasında **sadece 1 kategori** olmalı. Kategori adı, `HUKUK_BOT_HAZIR.md`'deki isimle aynı olmalı.

> **Legacy kuralı:** Aktif test seti her zaman kategori klasöründeki ana `sorular.json` dosyasıdır. Önceki sürümler aynı klasörde `legacy/` altında tarih damgalı dosya adıyla saklanır.

## Test Çalıştırma

### Docker ile (Önerilen)

```bash
# Tek kategori test et
docker exec hak-bul-backend python test_api_otomatik.py \
  --sorular test_sorular/01_is_hukuku/sorular.json

# Çıktı otomatik: test_results/is_hukuku/test_sonuclari_YYYYMMDD_HHMMSS.json
```

### Local

```bash
cd backend
python test_api_otomatik.py --sorular test_sorular/01_is_hukuku/sorular.json
```

### Özel Parametreler

```bash
# Bekleme süresi değiştir (rate limit için)
docker exec hak-bul-backend python test_api_otomatik.py \
  --sorular test_sorular/01_is_hukuku/sorular.json \
  --bekleme 4

# Özel çıktı yolu
docker exec hak-bul-backend python test_api_otomatik.py \
  --sorular test_sorular/01_is_hukuku/sorular.json \
  --cikti test_results/manuel_test.json
```

## Ekip Çalışma Düzeni

Herkes kendi kategorilerinin sorularını yazar ve test eder:

| Kişi | Kategoriler | Klasörler |
|---|---|---|
| **Ahmet** | İş, Medeni, Ceza, Ticaret | `01_is_hukuku`, `02_medeni_hukuk`, `03_ceza_hukuku`, `04_ticaret_hukuku` |
| **Elif** | Tüketici, Taşınmaz, İdare, Vergi | `05_tuketici_hukuku`, `06_tasinmaz_mulk`, `07_idare_hukuku`, `08_vergi_hukuku` |
| **Mehmet** | Sosyal Güvenlik, Fikri Mülkiyet, Bilişim | `09_sosyal_guvenlik_hukuku`, `10_fikri_mulkiyet`, `11_bilisim_hukuku` |
| **Zeynep** | Anayasa, Usul, Diğer | `12_anayasa_hukuku`, `13_usul_hukuku`, `14_diger` |

## Retrieval Metrik Değerlendirmesi

Test çalıştırdıktan sonra `evaluate_retrieval.py` ile `retrieval@5` metriklerini otomatik üretin:

```bash
# Tek kategori — en güncel test_sonuclari ile otomatik eşleşir
python scripts/evaluate_retrieval.py --kategori 01_is_hukuku

# Manuel dosya belirterek
python scripts/evaluate_retrieval.py \
  --sorular test_sorular/01_is_hukuku/sorular.json \
  --sonuclar test_results/01_is_hukuku/test_sonuclari_YYYYMMDD_HHMMSS.json

# 4 hedef kategori için birleşik baseline raporu
python scripts/evaluate_retrieval.py --all \
  --out test_results/baseline_retrieval_20260415.md \
  --json-out test_results/baseline_retrieval_20260415.json
```

**Docker ile:**
```bash
docker exec hak-bul-backend python scripts/evaluate_retrieval.py --all
```

**Metrikler:**

| Metrik | Açıklama |
|---|---|
| `retrieval@5_kanun` | Beklenen kanunlardan en az biri top-5 kaynakta mı? |
| `retrieval@5_kanun_madde` | Beklenen kanun+madde aynı chunk'ta mı? |

**Baseline (20260415):** `retrieval@5_kanun = 22/48 (45.8%)` — Faz 1/2/3 sonrası bu sayıyı referans alın.

## İş Akışı

```
1. sorular.json'a 12 soru yaz (beklenen_kanunlar/maddeler ile)
2. Testi çalıştır → test_results/XX/test_sonuclari_*.json
3. evaluate_retrieval.py ile retrieval@5 metriklerini hesapla
4. JSON çıktısını kopyala
5. test-degerlendirme-prompt.md şablonu ile AI'a gönder
6. Değerlendirme raporunu test_results/raporlar/ altına kaydet
```

## Değerlendirme Prompt

Bkz: [`docs/guides/test-degerlendirme-prompt.md`](../../docs/guides/test-degerlendirme-prompt.md)

## Konsol Çıktısı Örneği

```
[  1/12] [İş Hukuku               ] ✅ 5.4s | kat=✅ cevap=1842chr skor=0.862
[  2/12] [İş Hukuku               ] ✅ 2.2s | kat=✅ cevap=2103chr skor=0.874
[  3/12] [İş Hukuku               ] ✅ 6.1s | kat=❌ cevap=312chr skor=0.543
```

## Metrikler

| Metrik | Açıklama | 🟢 İyi | 🔴 Kötü |
|---|---|---|---|
| **Başarı Oranı** | HTTP 200 döndü mü? | %100 | <%80 |
| **Kat. Doğruluk** | Kategori doğru mu? | %100 | <%70 |
| **Cevap Uzunluğu** | Karakter sayısı | 500-3000 | <200 veya >5000 |
| **Ort. Kaynak Skoru** | Retrieval alaka düzeyi | ≥0.75 | <0.60 |
| **retrieval@5_kanun** | Beklenen kanun top-5'te mi? | ≥80% | <50% |
| **retrieval@5_kanun_madde** | Beklenen kanun+madde top-5'te mi? | ≥50% | <20% |
