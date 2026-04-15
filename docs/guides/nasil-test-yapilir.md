# Hak-Bul — Test Rehberi

> **Okuma süresi:** 10 dakika — Sonuna kadar oku, ezbere test yapma.

---

## Bu Dokümanda Ne Var?

1. [Ne Test Ediyoruz?](#1-ne-test-ediyoruz)
2. [Ortam Kurulumu](#2-ortam-kurulumu)
3. [Soru Formatı](#3-soru-formatı)
4. [Testi Çalıştır](#4-testi-çalıştır)
5. [Retrieval Değerlendirmesi](#5-retrieval-değerlendirmesi)
6. [Çıktıyı Nasıl Yorumlarsın?](#6-çıktıyı-nasıl-yorumlarsın)
7. [Kabul Kriterleri](#7-kabul-kriterleri)
8. [Ekip İş Bölümü](#8-ekip-iş-bölümü)
9. [Sık Sorulan Sorular](#9-sık-sorulan-sorular)

---

## 1. Ne Test Ediyoruz?

### Amaç: Retrieval Kalitesi

Test sistemi **sistemin doğru kanunu ve maddeyi getirip getiremediğini** ölçer.

Yanlış anlama: "API 200 döndü, test başarılı." — Bu **yanlış**.  
Doğru anlama: "Kıdem tazminatı sorusuna 4857 İş Kanunu'nun m.17'si geldi mi?"

Ölçülen iki şey:

| Metrik | Sorusu | İyi eşik |
|---|---|---|
| `retrieval@5_kanun` | Beklenen kanunlardan en az biri top-5'te mi? | ≥ %70 |
| `retrieval@5_kanun_madde` | Beklenen kanun + madde aynı chunk'ta mı? | ≥ %30 |

### Neden İkisi Farklı?

- **Kanun isabeti yüksek, madde isabeti düşük** → Doğru kanunun bölümlerini getiremiyoruz. Reranker işi.
- **İkisi de düşük** → O kategori için kanun corpus'ta olmayabilir ya da embedding semantiği çalışmıyor.
- **Skor yüksek ama metrikler düşük** → Normalizasyon baskısı (Faz 1 ile giderildi). Tek başına skora bakma.

### Baseline (Faz 4, 15 Nisan 2026)

| Kategori | retrieval@5_kanun | retrieval@5_kanun_madde |
|---|---|---|
| İş Hukuku | 7/12 — %58 | 2/9 — %22 |
| Ceza Hukuku | 9/12 — %75 | 5/12 — %42 |
| Usul Hukuku | 9/12 — %75 | 3/11 — %27 |
| Genel Hukuk | 7/12 — %58 | 2/6 — %33 |
| **Toplam** | **32/48 — %67** | **12/38 — %32** |

Bu sayılar referans noktandır. Kendi kategorini test ettikten sonra bu tabloya kıyasla yorumla.

---

## 2. Ortam Kurulumu

Projeyi ayağa kaldırma adımları için bkz. **`README.md`** (kök dizin). Burada sadece test-spesifik adımlar var.

### Önce Kontrol Et

```bash
# Backend çalışıyor mu?
docker-compose ps

# Model hazır mı? (ilk başlatmada model indirilir, 1-2 dk sürer)
docker-compose logs backend | tail -20
```

Loglarda `Uvicorn running on http://0.0.0.0:8000` görürsen hazırsın.

### .env Dosyası — Kritik

`.env` dosyasını **ekipten al**. Kendi başına oluşturma — eksik veya yanlış değerler sessizce hatalı test sonuçları üretir.

- **Docker kullanıyorsan:** `.env.docker` dosyası gerekir. Mevcut `.env.docker` dosyası güncel olmayabilir — elinde güncel `.env` varsa onun içeriğini `.env.docker`'a kopyala. Bunu çözemiyorsan Docker kullanma, local çalıştır.
- **Local çalıştırıyorsan:** `.env` dosyası gerekir.

Kontrol etmen gereken alanlar (her iki dosyada da aynı):

```bash
EMBEDDING_MODEL=intfloat/multilingual-e5-base     # ZORUNLU — yanlış model vektörleri bozmaya yeter
QDRANT_COLLECTION=hukuk_chunks                    # Kararlar collection
QDRANT_COLLECTION_KANUN=hukuk_chunks_v2           # Kanunlar collection — bu yoksa kanun retrieval'ı kötüleşir
RERANKER_ENABLED=true                             # Madde isabetini artırır
GROQ_API_KEY=gsk_...                              # Kendi key'in
```

> **Embedding model çok önemli:** Qdrant, `intfloat/multilingual-e5-base` ile indexlendi. Farklı bir model yazarsan vektörler anlamsız olur, tüm retrieval çöker. İş Hukuku %0'a düşer.

### Branch

Güncel kod `main` branch'indedir. Testleri çalıştırmadan önce bu branch'te olduğundan ve en güncel kodu çektiğinden emin ol:

```bash
git fetch origin
git checkout main
git pull
```

---

## 3. Soru Formatı

Eski format (sadece string) hâlâ destekleniyor ama **yeni format kullan**. Evaluator metrikleri yeni formata dayanır.

### Yeni Format (Zorunlu)

```json
{
  "İş Hukuku": [
    {
      "soru": "İşten çıkarıldım, kıdem ve ihbar tazminatımı hangi şartlarda alabilirim?",
      "beklenen_kanunlar": ["1475", "4857"],
      "beklenen_maddeler": ["14", "17"],
      "notlar": "Kıdem: 1475 m.14; ihbar: 4857 m.17"
    },
    {
      "soru": "Fazla mesai ücreti nasıl hesaplanır?",
      "beklenen_kanunlar": ["4857"],
      "beklenen_maddeler": ["41"],
      "notlar": "4857 m.41 — haftalık 45 saatin üzeri, 1.5 kat."
    }
  ]
}
```

### Alan Açıklamaları

| Alan | Zorunlu | Açıklama |
|---|---|---|
| `soru` | Evet | Vatandaşın soracağı gerçekçi soru |
| `beklenen_kanunlar` | Evet | Bu sorunun cevabı için hangi kanun(lar) gelmeli? (kanun numarası) |
| `beklenen_maddeler` | Hayır | Kanundaki hangi madde? (boş bırakılabilir) |
| `notlar` | Hayır | Neden bu kanun/madde — evaluator bunu kullanmaz, senin için not |

### Yapay Zeka ile Soru Oluşturma

Soru setini sıfırdan yazmak yerine AI yardımıyla üretebilirsin. Bunun için hazır bir prompt var:  
📄 [`docs/guides/test-degerlendirme-prompt.md`](test-degerlendirme-prompt.md) → "1. Test Sorusu Oluşturma Promptu" bölümü

Prompt, doğru JSON formatını, 12 soru kuralını ve `beklenen_kanunlar`/`beklenen_maddeler` alanlarını otomatik dolduruyor.

**Ancak AI çıktısını doğrudan kullanma. Aşağıdakileri mutlaka elle kontrol et:**

| Alan | Kontrol Edilecek | Neden |
|---|---|---|
| `beklenen_kanunlar` | Kanun numarası doğru mu? Türkiye'de bu kanun var mı? | AI yanlış veya mülga kanun numarası yazabilir |
| `beklenen_maddeler` | Madde numarası doğru mu? O kanunda o madde var mı? | AI var olmayan madde numarası üretebilir |
| `soru` | Soru vatandaş dilinde mi, gerçekçi mi? | AI akademik veya teknik dil kullanabilir |
| `notlar` | Açıklama doğru mu? | Notlarda yanlış mevzuat atfı olabilir |

> En az bir hukuki kaynaktan (mevzuat.gov.tr, e-mevzuat) ilgili kanunu açıp madde numaralarını teyit et. Yanlış `beklenen_maddeler` evaluator metriklerini bozar — sistemin değil senin verindir.

### Dikkat: Corpus'ta Olmayan Kanunlar

Bazı kanunlar vektör veritabanında yok. `notlar` alanına "corpus'ta yok" yaz — bu soruların evaluator'da `miss` çıkması normaldir:

- 5352 Adli Sicil Kanunu
- 6458 Yabancılar ve UKK
- 5901 Türk Vatandaşlığı Kanunu
- 6735 Uluslararası İşgücü Kanunu
- 4982 Bilgi Edinme Hakkı Kanunu
- 3071 Dilekçe Hakkı Kanunu

Bu kanunları bekleyen soruların miss olması **sistem hatası değil**, corpus eksikliğidir.

---

## 4. Testi Çalıştır

### Local

Backend bir virtual environment (venv) ile çalışır. Testi çalıştırmadan önce venv'i aktif et (kurulum için bkz. `README.md` → "Local Kurulum" bölümü):

```bash
# Windows
cd C:\Github\Hak-Bul\backend
.venv\Scripts\activate

# macOS / Linux
cd ~/Github/Hak-Bul/backend
source .venv/bin/activate
```

Sonra testi çalıştır:

```bash
python test_api_otomatik.py --sorular test_sorular/01_is_hukuku/sorular.json
```

### Docker

```bash
docker exec hak-bul-backend python test_api_otomatik.py \
  --sorular test_sorular/01_is_hukuku/sorular.json
```

### Konsolda Ne Göreceksin?

```
[  1/12] [İş Hukuku               ] ✅ 5.4s | kat=✅ cevap=1842chr skor=0.862
[  2/12] [İş Hukuku               ] ✅ 2.2s | kat=✅ cevap=2103chr skor=0.874
[  3/12] [İş Hukuku               ] ❌ Rate limit 429: Too Many Requests
      ⏳ Rate limit, 4s sonra tekrar denenecek (1/3)
```

| Gösterge | Anlamı |
|---|---|
| `kat=✅` | Kategori doğru tespit edildi |
| `kat=❌` | Kategorizer sınıflandırmayı yanlış yaptı |
| `cevap=1842chr` | Cevap uzunluğu (500–3000 arası normal) |
| `skor=0.862` | Ortalama kaynak skoru (tek başına güvenilir değil — bkz. §1) |

### Rate Limit Hatası

```
❌ HTTP 503: Service Unavailable
❌ Rate limit 429: Too Many Requests
```

**Testin bu kısmı geçersiz.** Ctrl+C ile durdur, 15-30 dakika bekle, tekrar çalıştır.

```bash
# Sorular arası beklemeyi artırarak rate limit riskini azalt
python test_api_otomatik.py \
  --sorular test_sorular/01_is_hukuku/sorular.json \
  --bekleme 6
```

### Sonuç Nereye Kaydedilir?

```
backend/test_results/01_is_hukuku/test_sonuclari_20260415_143000.json
```

Klasör adı kategorinin adı, zaman damgası otomatik eklenir. Birden fazla çalıştırırsan hepsi birikir; evaluator en güncel dosyayı otomatik seçer.

---

## 5. Retrieval Değerlendirmesi

Test runner bittikten sonra **evaluator'ı mutlaka çalıştır**. Aksi hâlde sadece "API 200 döndü" biliyorsun — asıl ölçüm eksik.

### Tek Kategori

```bash
# Local
python scripts/evaluate_retrieval.py --kategori 01_is_hukuku

# Docker
docker exec hak-bul-backend python scripts/evaluate_retrieval.py --kategori 01_is_hukuku
```

### Tüm Hedef Kategoriler

```bash
python scripts/evaluate_retrieval.py --all \
  --out test_results/faz_sonrasi_retrieval.md \
  --json-out test_results/faz_sonrasi_retrieval.json
```

### Evaluator Çıktısı

```
=== RETRIEVAL@5 DEĞERLENDİRMESİ ===

Kategori: İş Hukuku
  Soru 1: kıdem tazminatı koşulları  →  kanun: HIT (4857)  madde: HIT (m.17)
  Soru 2: fazla mesai ücreti         →  kanun: HIT (4857)  madde: MISS
  Soru 3: adli sicil kaydı           →  kanun: MISS        madde: MISS  [corpus yok: 5352]

retrieval@5_kanun:       7/12  (%58.3)
retrieval@5_kanun_madde: 2/9   (%22.2)
```

- **HIT**: Beklenen kanun/madde top-5'te var
- **MISS**: Yok
- `[corpus yok]` notu: O kanun vektör veritabanında hiç yüklü değil — sistem hatası değil

---

## 6. Çıktıyı Nasıl Yorumlarsın?

### Senaryo 1 — Her şey iyi

```
retrieval@5_kanun:       10/12  (%83)
retrieval@5_kanun_madde:  5/10  (%50)
```

Baseline'ın üstünde. Commit et, raporla.

### Senaryo 2 — Kanun geliyor, madde gelmiyor

```
retrieval@5_kanun:        9/12  (%75)   ← iyi
retrieval@5_kanun_madde:  1/9   (%11)   ← kötü
```

Doğru kanunun yanlış bölümleri geliyor. Reranker bu durumu iyileştirmeli — `RERANKER_ENABLED=true` olduğunu doğrula.

### Senaryo 3 — İkisi de düşük, corpus notu yok

```
retrieval@5_kanun:       3/12   (%25)
retrieval@5_kanun_madde: 0/5    (%0)
```

Ciddi sorun: embedding modeli, category penalty veya collection bağlantısı ile ilgili bir şeyler yanlış. Bkz. [ortam kurulumu](#2-ortam-kurulumu) — `.env` değerlerini kontrol et.

Kendi başına çözemediysen **ekibe bildir**: ortam kurulumu, `.env` değerleri veya sistem altyapısında bir sorun olabilir. Bunu tek başına çözmeye çalışma, zaman kaybetme.

### Senaryo 4 — Miss'ler corpus yoktur notlu

```
Soru 7: [corpus yok: 6458]   → MISS
Soru 8: [corpus yok: 5901]   → MISS
```

Bu normaldir. Corpus'ta olmayan kanunları bekleyen sorular her zaman miss olur. Genel başarıyı değerlendirirken bu soruları paydandan çıkarabilirsin.

---

## 7. Kabul Kriterleri

Test sonucunu geçerli saymak için:

| Kriter | Eşik | Kontrol |
|---|---|---|
| HTTP başarı oranı | %100 | Tüm 12 soru `✅` ile bitmeli |
| Rate limit | 0 hata | 429/503 alınmışsa testi tekrarla |
| retrieval@5_kanun | ≥ %60 | Corpus eksiklerini hariç tutarak hesapla |
| retrieval@5_kanun_madde | ≥ %25 | Madde alanı dolu sorular üzerinden |

**Bu eşiklerin altındaysan sonucu raporlama, önce nedeni araştır:**

1. `.env` dosyasındaki `EMBEDDING_MODEL` doğru mu?
2. `QDRANT_COLLECTION_KANUN` tanımlı mı?
3. `RERANKER_ENABLED=true` mi?
4. Soru formatın yeni dict formatında mı (`beklenen_kanunlar` alanı var mı)?

---

## 8. Ekip İş Bölümü

| Kategoriler | Klasörler |
|---|---|
| İş, Medeni, Ceza, Ticaret | `01_is_hukuku`, `02_medeni_hukuk`, `03_ceza_hukuku`, `04_ticaret_hukuku` |
| Tüketici, Taşınmaz, İdare, Vergi | `05_tuketici_hukuku`, `06_tasinmaz_mulk`, `07_idare_hukuku`, `08_vergi_hukuku` |
| Sosyal Güvenlik, Fikri Mülkiyet, Bilişim | `09_sosyal_guvenlik_hukuku`, `10_fikri_mulkiyet`, `11_bilisim_hukuku` |
| Anayasa, Usul, Genel | `12_anayasa_hukuku`, `13_usul_hukuku`, `14_genel_hukuk` |

### Tam İş Akışı

```
1. git checkout main && git pull
2. .env dosyasını ekipten al — kendi başına oluşturma
3. sorular.json'a 12 soru yaz (yeni dict formatında, beklenen_kanunlar ile)
4. Ortamı hazırla: docker-compose up -d --build  VEYA  venv aktif et (bkz. §4)
5. python test_api_otomatik.py --sorular test_sorular/XX_.../sorular.json
6. python scripts/evaluate_retrieval.py --kategori XX_...
7. Sonuçları yorumla (bkz. §6) — kabul kriterlerine bak (bkz. §7)
8. test_results/raporlar/ altına kısa bir analiz notu yaz
```

### Neden Önce Yorumla, Sonra Raporla?

Ezbere çalıştırılan bir test yanıltıcı olabilir:

- `kat=✅` demesi kategorizenin doğru çalıştığını gösterir, retrieval'ı değil.
- `skor=0.95` demesi doğru kanunun geldiğini **garantilemez** — normalizasyon skoru şişirebilir.
- `retrieval@5_kanun=%46` baseline'dan gerileme demektir — bu bir commit'te regresyon var anlamına gelebilir.

Her test sonrasında evaluator çalıştır, sayıları baseline ile karşılaştır.

---

## 9. Sık Sorulan Sorular

**"İlk soruda timeout alıyorum, sonraki sorular da yanıt vermiyor"**  
→ Embedding modeli indiriliyor olabilir (1.1 GB). İlk backend başlatmada model yoksa otomatik indirilir, bu sırada gelen istekler zaman aşımına uğrar. Backend loglarından takip et:
```bash
docker-compose logs -f backend
# veya local: backend konsol çıktısına bak
```
`"Model yüklendi"` veya `"Uvicorn running"` mesajını gördükten sonra testi başlat.

**"Backend başlamıyor"**  
→ `docker-compose logs backend` bak. GROQ_API_KEY, QDRANT_URL doğru mu?

**"429 hatası sürekli geliyor"**  
→ `--bekleme 6` veya `--bekleme 8` ekle. Hâlâ oluyorsa 30 dk bekle.

**"Sorum doğru cevabı verdi ama evaluator MISS diyor"**  
→ LLM'in ürettiği yanıt değil, *retrieval'ın getirdiği chunk* değerlendiriliyor. Yanıt doğru olsa bile chunk yanlış kaynaktan gelmişse metrik MISS.

**"Beklenen kanun corpus'ta yok, bu sonuçları etkiler mi?"**  
→ Evet, miss sayılır. `notlar` alanına "corpus'ta yok" yaz. Genel başarı yüzdesini yorumlarken bu soruları paydandan çıkarabilirsin.

**"Skor 0.5'in altında ne demek?"**  
→ Retrieval alakasız kaynak getiriyor. Tek başına aksiyon almaya yetmez — evaluator metriklerine bak.

**"Evaluator eski test dosyasını mı okuyor?"**  
→ Evaluator `test_results/XX_kategori/` içindeki en güncel `test_sonuclari_*.json`'ı otomatik seçer. `archive/` altındakileri atlar.

---

## Bağlantılı Dokümanlar

- Proje kurulumu: `README.md` (kök dizin)
- Baseline ölçüm detayları: [`docs/tests/FAZ4_RETRIEVAL_BASELINE.md`](../tests/FAZ4_RETRIEVAL_BASELINE.md)
- Test soru formatı ve klasör yapısı: [`backend/test_sorular/README.md`](../../backend/test_sorular/README.md)
- AI değerlendirme şablonu: [`docs/guides/test-degerlendirme-prompt.md`](test-degerlendirme-prompt.md)
