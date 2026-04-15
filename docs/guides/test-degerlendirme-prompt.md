# Hak-Bul Test Prompt Rehberi

## Ne Zaman Kullanılır?

Bu doküman iki iş için kullanılır:

1. Yeni kategori veya mevcut kategori için vatandaş odaklı test soruları üretmek
2. `test_api_otomatik.py` çalıştıktan sonra `test_results/` altındaki JSON çıktısını yapay zeka ile niteliksel olarak değerlendirmek

---

## 1. Test Sorusu Oluşturma Promptu

Aşağıdaki prompt, `backend/test_sorular/XX_kategori_adi/sorular.json` yapısına uygun yeni soru seti üretmek içindir.

Kullanım amacı:
- Mevcut soru setini yenilemek
- Yeni bir kategori için test soruları hazırlamak
- Soruları Türkiye'de vatandaşların gerçekten sık sorduğu hukuki sorulara yaklaştırmak

### Kullanım Notları

- Çıktı yalnızca JSON olmalı
- JSON içinde sadece 1 kategori anahtarı bulunmalı
- Soru sayısı tam `12` olmalı
- Her soru düz string değil, dict nesnesi olarak üretilmeli
- Sorular akademik veya ders anlatımı gibi değil, vatandaş diliyle ve pratik problem odaklı olmalı
- Sorular Türkiye bağlamında güncel mevzuat ve güncel vatandaş ihtiyacına göre hazırlanmalı
- Aynı anlama gelen tekrar sorular üretilmemeli
- Her soru için retrieval değerlendirmesinde kullanılacak `beklenen_kanunlar` alanı doldurulmalı
- Mümkün olan sorularda `beklenen_maddeler` alanı da doldurulmalı
- Gerekliyse kısa bir `notlar` alanı eklenebilir
- Çıktı doğrudan ilgili klasördeki `sorular.json` dosyasına yapıştırılabilecek formatta olmalı

### Prompt Şablonu

Aşağıdaki metni kopyala, `{KATEGORI_ADI}` ve `{HEDEF_KLASOR}` alanlarını doldur, gerekiyorsa mevcut soru setini de ekleyip AI'a gönder.

---

```text
Sen Türk hukuku alanında çalışan bir test veri seti hazırlayıcısısın.
Amacın, Hak-Bul isimli Türk hukuk asistanı için vatandaş odaklı test soru seti oluşturmaktır.

Hedef kategori: {KATEGORI_ADI}
Hedef klasör: {HEDEF_KLASOR}

Lütfen aşağıdaki kurallara göre yeni bir soru seti üret:

1. Çıktı yalnızca JSON olsun.
2. JSON içinde sadece 1 kategori anahtarı bulunsun.
3. Kategori adı tam olarak `{KATEGORI_ADI}` olsun.
4. Toplam soru sayısı tam olarak 12 olsun.
5. Her soru bir dict nesnesi olsun ve şu alanları içersin:
   - `soru`: vatandaş diliyle yazılmış soru metni
   - `beklenen_kanunlar`: bu soruda retrieval içinde gelmesini beklediğimiz kanun numaraları listesi
   - `beklenen_maddeler`: mümkünse gelmesini beklediğimiz madde numaraları listesi
   - `notlar`: kısa değerlendirme notu veya beklenen eşleşme açıklaması
6. `beklenen_kanunlar` alanı boş bırakılmamalı; her soru için en az 1 kanun numarası yazılmalı.
7. `beklenen_maddeler` alanı yalnızca gerçekten makul ölçüde spesifik bir madde beklentisi varsa doldurulmalı; emin olunmayan durumda boş liste kullanılmalı.
8. `notlar` alanı kısa, somut ve evaluator mantığını destekleyecek şekilde yazılmalı; uzun açıklama yapılmamalı.
9. Sorular Türkiye'de vatandaşların bu hukuk başlığında en sık sorabileceği, pratik ve gerçek hayata yakın sorular olsun.
10. Sorular mevzuat ezberi ölçen akademik sorular gibi değil, vatandaşın arama motoruna veya hukuk asistanına yazacağı doğal sorular gibi olsun.
11. Soru seti dengeli olsun:
   - yüksek frekanslı günlük sorunlar
   - hak arama ve başvuru süreçleri
   - süre, itiraz, tazminat, başvuru mercii gibi kritik konular
12. Aynı konu farklı cümlelerle tekrar edilmesin.
13. Sorular kısa ama yeterince net olsun.
14. Kanun numaraları ve madde numaraları mümkün olduğunca güncel ve doğru mevzuata göre seçilsin.
15. Açıklama, maddeleme, yorum veya ek not yazma; sadece JSON üret.

İstenen çıktı formatı tam olarak şöyle olsun:

{
  "{KATEGORI_ADI}": [
    {
      "soru": "Soru 1?",
      "beklenen_kanunlar": ["0000"],
      "beklenen_maddeler": ["00"],
      "notlar": "Kısa not"
    },
    {
      "soru": "Soru 2?",
      "beklenen_kanunlar": ["0000"],
      "beklenen_maddeler": [],
      "notlar": "Kısa not"
    }
  ]
}

Eğer mevcut soru seti zayıf, tekrar eden veya fazla akademikse, onu daha vatandaş odaklı olacak şekilde baştan yenile.
```

---

### Mevcut Dosyayı Yenileme İçin Ek Komut

Eğer AI'ın mevcut dosyayı da görerek daha iyi bir yenileme yapmasını istiyorsan şu cümleyi prompt sonuna ekle:

```text
Aşağıda mevcut soru seti var. Bunu referans al ama gerekirse tamamen yeniden yazarak daha güçlü, daha güncel, daha vatandaş odaklı ve Faz 4 retrieval değerlendirme şemasına uygun bir 12 soruluk set üret. Çıktıdaki her soru `soru`, `beklenen_kanunlar`, `beklenen_maddeler`, `notlar` alanlarını içersin:

{MEVCUT_SORU_JSONI}
```

---

## 2. Test Sonucu Değerlendirme Promptu

Bu prompt, `test_api_otomatik.py` çalıştırıldıktan sonra oluşan sonuç JSON'ını yapay zeka ile değerlendirmek içindir.

### Referans Analiz Stili

Değerlendirme çıktısının dili, bölüm yapısı ve ayrıntı seviyesi için şu dosya referans alınmalıdır:

- [`backend\test_results\12_anayasa_hukuku\analiz1.md`]("C:\Github\Hak-Bul\backend\test_results\12_anayasa_hukuku\analiz1.md")

AI'dan, analiz üretirken bu dosyadaki gibi:
- önce güçlü bir özet vermesi
- sonra başlık bazlı puanlama yapması
- somut örneklerle hata ve güçlü yön göstermesi
- en sonda net iyileştirme önerileri sunması
istenmelidir.

### Prompt Şablonu

Aşağıdaki metni kopyala, `{JSON_VERI}` kısmını test çıktı JSON'ının içeriği ile değiştir ve AI'a gönder.

---

```text
Sen bir Türk hukuku uzmanı ve RAG (Retrieval-Augmented Generation) sistem değerlendiricisisin.
Aşağıda bir Türk hukuku asistanının (Hak-Bul) test sonuçları var.
Her test kaydında bir hukuk sorusu, modelin cevabı, getirilen kaynaklar ve otomatik metrikler bulunuyor.

Değerlendirme çıktısını üretirken şu referans analiz stilini örnek al:
`backend/test_results/14_genel_hukuk/analiz1.md`

Lütfen analizini bu referans dosyadaki gibi yaz:
- önce kısa ama net bir genel değerlendirme yap
- ardından başlık başlık detaylı analiz ver
- puanları başlık içinde açıkça belirt
- sorunları somut soru örnekleriyle göster
- güçlü örnekleri de belirt
- en sonda net ve uygulanabilir iyileştirme önerileri sun

Lütfen aşağıdaki 4 başlıkta değerlendirme yap:

## 1. Kategori Tespit Doğruluğu
- Model soruları doğru kategorilere sınıflandırmış mı?
- Yanlış sınıflandırılan sorular hangileri? Ortak bir patern var mı?

## 2. Cevap Kalitesi (Answer Relevance)
- Cevaplar soruyu doğrudan yanıtlıyor mu, yoksa saçmalıyor mu?
- Cevaplar çok kısa (<200 karakter) veya aşırı uzun (>5000 karakter) mi?
- Hangi kategorilerdeki cevaplar en zayıf?

## 3. Kaynak Alaka Düzeyi (Context Precision)
- Getirilen kaynaklar (kanun maddeleri, Yargıtay kararları) soruyla alakalı mı?
- Ortalama kaynak skoru düşük (<0.7) olan sorular var mı?
- Kaynaklar güncel ve doğru kanunlara mı atıf yapıyor?

## 4. Halüsinasyon (Faithfulness)
- Model kaynaklarda olmayan bilgi uyduruyor mu?
- Yanlış kanun maddesi, yanlış süre, yanlış ceza miktarı veya yanlış başvuru mercii veriyor mu?
- "Bu konu profesyonel hukuki destek gerektirmektedir" uyarısı uygun yerlerde mi çıkıyor?

## Özet Skor Tablosu
Her kategori için 0-10 arasında puan ver:

| Kategori | Kategori Tespit | Cevap Kalitesi | Kaynak Alaka | Halüsinasyon Yokluğu | GENEL |
|---|---|---|---|---|---|
| ... | /10 | /10 | /10 | /10 | /10 |

## İyileştirme Önerileri
- En kritik 3 sorun nedir?
- Hangi kategorilerde retrieval (kaynak getirme) iyileştirilmeli?
- Hangi kategorilerde generator (cevap üretme) prompt'u düzeltilmeli?
- Vektör veritabanına hangi hukuk alanlarından daha fazla veri eklenmeli?

Analiz dili doğrudan, teknik ve somut olsun.
Genel geçer cümleler yerine soru bazlı örneklerle konuş.
Gerekirse bazı sorular için doğru mevzuat veya doğru merci yönünü ayrıca belirt.

En sonda analizini gerekli dizine markdown olarak kaydet

---

TEST SONUÇLARI (JSON):

{JSON_VERI}
```

---

## 3. Hızlı Batch Kullanımı

Eğer bütün sonucu tek seferde göndermek çok uzunsa, kategori bazlı veya parça parça değerlendirme yapılabilir.

```text
Aşağıda Hak-Bul hukuk asistanının {KATEGORI_ADI} kategorisindeki test sonuçları var.

Değerlendirme çıktısını üretirken şu referans analiz stilini örnek al:
`backend/test_results/14_genel_hukuk/analiz1.md`

Bu kategorideki cevapları değerlendir:
1. Cevap soruyu yanıtlıyor mu?
2. Kaynaklar alakalı mı?
3. Halüsinasyon var mı?
4. Kategori tespiti doğru mu?
5. Puan (0-10)

SONUÇLAR:

{ILGILI_KATEGORININ_JSON_ARRAYI}
```

---

## 4. JSON'dan İlgili Kategoriyi Çıkarma

Python ile tek komut:

```bash
cd backend
python -c "
import json
veri = json.load(open('test_results/08042026/test_sonuclari_YYYYMMDD_HHMMSS.json', encoding='utf-8'))
kat_sonuclar = [s for s in veri['sonuclar'] if s['kategori_beklenen'] == 'Ceza Hukuku']
print(json.dumps({'kategori': 'Ceza Hukuku', 'sonuclar': kat_sonuclar}, ensure_ascii=False, indent=2))
"
```

---

## 5. Değerlendirme Sıklığı Önerisi

| Durum | Sıklık |
|---|---|
| Yeni veri yüklendiyse | Hemen test et |
| RAG pipeline değiştiyse | Hemen test et |
| Normal geliştirme | Haftada 1 |
| Production öncesi | Zorunlu |

---

## 6. Skor Yorumlama

| Metrik | İyi | Orta | Kötü |
|---|---|---|---|
| **Kategori Doğruluğu** | ≥ %90 | %70-89 | < %70 |
| **Ort. Cevap Uzunluğu** | 500-3000 chr | 200-499 veya 3001-5000 | < 200 veya > 5000 |
| **Ort. Kaynak Skoru** | ≥ 0.75 | 0.60-0.74 | < 0.60 |
| **AI Genel Puan** | ≥ 8/10 | 6-7/10 | < 6/10 |
