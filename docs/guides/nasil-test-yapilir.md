# 🧪 Hak-Bul — Test Nasıl Yapılır?

> ⏱️ **Okuma süresi:** 5 dakika  
> 🎯 **Amaç:** Kendi kategorindeki soruları test et, sonucu AI ile değerlendir.

---

## 1. Gereksinimler

### API Key Al
1. [console.groq.com](https://console.groq.com) → hesabına gir
2. **API Keys** → yeni key oluştur
3. Bu key'i **kimseyle paylaşma**

### `.env` Dosyasını Ayarla
Backend klasöründe `.env` dosyası yoksa `.env.example`'dan kopyala:

```bash
cd backend
cp .env.example .env
```

`.env` dosyasını aç, `GROQ_API_KEY` satırına kendi key'ini yapıştır:

```
GROQ_API_KEY=gsk_XXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

---

## 2. Docker'ı Ayağa Kaldır

```bash
# Projeye git
cd C:\Github\Hak-Bul

# Tüm servisleri başlat
docker-compose up -d --build

# Backend hazır mı kontrol et (bu komut 200 dönmeli)
docker exec hak-bul-backend python -c "print('✅ Backend hazır')"
```

✅ **"Backend hazır"** yazısını görmeden test **çalıştırma**.

---

## 3. Sorularını Yaz

Kendi klasörünü bul:

| Kişi | Klasörler |
|---|---|
| Mustafa | `test_sorular/01_is_hukuku`, `02_medeni_hukuk`, `03_ceza_hukuku`, `04_ticaret_hukuku` |
| Omer | `05_tuketici_hukuku`, `06_tasinmaz_mulk`, `07_idare_hukuku`, `08_vergi_hukuku` |
| Yağız | `09_sosyal_guvenlik_hukuku`, `10_fikri_mulkiyet`, `11_bilisim_hukuku` |
| Erdem | `12_anayasa_hukuku`, `13_usul_hukuku`, `genel_hukuk` |


Klasöründeki `sorular.json` dosyasını aç:

```
backend/test_sorular/01_is_hukuku/sorular.json
```

İçine **12 soru** yaz:

```json
{
  "İş Hukuku": [
    "İşten haksız çıkarılırsam hangi haklarımı alırım?",
    "Kıdem tazminatı nasıl hesaplanır?",
    "Fazla mesai ücreti ne kadar ödenir?",
    "... 9 soru daha"
  ]
}
```

> ⚠️ **Kural:** JSON'da **sadece 1 kategori** olmalı. Başka kategori ekleme.

---

## 4. Testi Çalıştır

```bash
cd C:\Github\Hak-Bul\backend

# Kendi klasörünü yaz
docker exec hak-bul-backend python test_api_otomatik.py \
  --sorular test_sorular/01_is_hukuku/sorular.json
```

> **Örnek:** Ahmet İş Hukuku test ediyorsa → `01_is_hukuku`, Elif Vergi Hukuku test ediyorsa → `08_vergi_hukuku`

### Konsolda Ne Göreceksin?

```
[  1/12] [İş Hukuku               ] ✅ 5.4s | kat=✅ cevap=1842chr skor=0.862
[  2/12] [İş Hukuku               ] ✅ 2.2s | kat=✅ cevap=2103chr skor=0.874
[  3/12] [İş Hukuku               ] ❌ Rate limit 429: Too Many Requests
      ⏳ Rate limit, 4s sonra tekrar denenecek (1/3)
```

- `kat=✅` → Kategori doğru tespit edildi
- `cevap=1842chr` → Cevap uzunluğu (500-3000 arası iyi)
- `skor=0.862` → Kaynak alaka düzeyi (≥0.75 iyi)

### ⛔ ÖNEMLİ: 503 / Rate Limit Hatası

Test sırasında **503** veya **Rate limit 429** hatası alıyorsan:

```
❌ HTTP 503: Service Unavailable
❌ Rate limit 429: Too Many Requests
```

→ **O testin sonucu GEÇERSİZ.** Groq API limit dolmuş, cevaplar eksik veya boş döner.

**Ne yapmalısın?**
1. Testi **durdur** (Ctrl+C)
2. **15-30 dakika bekle** (rate limit sıfırlansın)
3. Tekrar çalıştır

> 💡 **İpucu:** `--bekleme 6` ile sorular arası bekleme süresini artırırsan rate limit daha az tetiklenir.

```bash
docker exec hak-bul-backend python test_api_otomatik.py \
  --sorular test_sorular/01_is_hukuku/sorular.json \
  --bekleme 6
```

---

## 5. Sonuç Dosyası Nereye Kaydedildi?

Test bitince otomatik şu klasöre kaydedilir:

```
backend/test_results/01_is_hukuku/test_sonuclari_20260409_150000.json
```

> Klasör adın senin kategorinin adı. Tarih-saat otomatik eklenir.

---

## 6. AI ile Değerlendir

JSON dosyasını aç, içindeki `sonuclar` dizisini kopyala.

Şu adresteki şablonu kullan:  
📄 [`docs/guides/test-degerlendirme-prompt.md`](../../docs/guides/test-degerlendirme-prompt.md)

Şablonu kopyala, `{JSON_VERI}` yerine kendi JSON çıktını yapıştır, ChatGPT/Claude/Gemini'ye gönder.

AI sana şunu verecek:
- ✅ Cevap doğru mu?
- ✅ Kaynaklar alakalı mı?
- ✅ Halüsinasyon var mı?
- ✅ 0-10 arası puan

---

## 7. Hızlı Kontrol Listesi

Test çalıştırmadan önce:

- [ ] `.env` dosyasında `GROQ_API_KEY` var mı?
- [ ] Docker çalışıyor mu? (`docker-compose ps`)
- [ ] Sorularını `sorular.json`'a yazdın mı? (12 soru, tek kategori)
- [ ] JSON formatı doğru mu? (virgül, tırnak hatası yok)

Test sırasında:

- [ ] 503 veya 429 hatası aldın mı? → **Bekle**, tekrar çalıştır
- [ ] Test bitti mi? → JSON dosyasını kontrol et

Test bitince:

- [ ] JSON'u AI'a gönderdin mi?
- [ ] Değerlendirme sonucunu kaydettin mi?

---

## Sık Sorulan Sorular

**"Backend başlamıyor / hata veriyor"**
→ `.env`'de `GROQ_API_KEY` doğru mu kontrol et. Docker loglarına bak: `docker-compose logs backend`

**"429 hatası alıyorum, sürekli bekliyor"**
→ `--bekleme 6` veya `--bekleme 8` dene. Gerekirse 30 dk bekle.

**"Kategori doğruluğu %50 çıktı, bu normal mi?"**
→ Hayır. Categorizer'ın iyileştirilmesi gerekir. Sonucu raporla.

**"Skor 0.5'in altında, ne demek bu?"**
→ Retrieval alakasız kaynak getiriyor. Vektör veritabanında o kategoriye ait veri eksik olabilir.

**"JSON dosyam çok büyük, AI'a sığmıyor"**
→ Kategoriyi 3'er soruluk gruplara bölerek gönder. Şablondaki "Hızlı Batch Kullanımı" bölümüne bak.
