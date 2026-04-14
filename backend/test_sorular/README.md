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

```json
{
  "İş Hukuku": [
    "İşten haksız çıkarılırsam hangi haklarımı alırım?",
    "Kıdem tazminatı nasıl hesaplanır?",
    "Fazla mesai ücreti ne kadar ödenir?"
  ]
}
```

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

## İş Akışı

```
1. sorular.json'a 12 soru yaz
2. Testi çalıştır
3. JSON çıktısını kopyala
4. test-degerlendirme-prompt.md şablonu ile AI'a gönder
5. Değerlendirme raporunu test_results/raporlar/ altına kaydet
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
