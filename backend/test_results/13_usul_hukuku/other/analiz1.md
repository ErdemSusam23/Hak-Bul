Aşağıda detaylı değerlendirmem yer alıyor. Önce özet görsel, ardından detaylı analiz.

---

## 1. Kategori Tespit Doğruluğu — 0 / 10

**Sonuç: Tam başarısızlık.** 12 sorunun tamamı yanlış sınıflandırılmış. `kategori_dogruluk_orani: 0.0` sistem raporunda da bunu doğruluyor.

Tespit edilen kategoriler: Genel Hukuk (9), İş Hukuku (2), Ticaret Hukuku (1). "Usul Hukuku" hiçbir soruda çıkamamış.

**Ortak patern:** Anayasa Hukuku testinde olduğu gibi, model "Usul Hukuku" etiketini tanımıyor ya da etiket kümesinde bu kategori hiç tanımlı değil. Dikkat çekici örüntüler:

- "İcra takibi nasıl başlatılır" → Ticaret Hukuku (muhtemelen "icra" = ticari borç)
- "Arabuluculuk" + "Yargılama giderleri" → İş Hukuku (arabuluculuk ve yargılama gideri örnekleri iş hukukunda çok geçiyor)
- Kalan 9 soru → hepsi Genel Hukuk (fallback etiketi gibi davranıyor)

Yanlış etiket downstream'de tüm retrieval filtrelemesini bozuyor; İş Hukuku etiketiyle sorgulanan sorular İş Mahkemesi kararlarını, Genel Hukuk etiketiyle sorgulananlar ise genel temyiz/onama paragraflarını çekiyor.

---

## 2. Cevap Kalitesi (Answer Relevance) — 6 / 10

Teknik olarak cevaplar çökmüyor (12/12 başarılı) ve uzunluk makul (474–1994 karakter, ortalama 1368). Ancak içerik kalitesi sorular arasında çok değişken.

**İyi cevaplar:**
- **S2 – İcra takibi:** Doğrudan ve atıfları yerinde (İİK m.35, m.57, m.103). Açık ve kullanışlı.
- **S8 – İhtiyati tedbir:** Kaynaklara tam dayanan, madde numaraları doğru, akıcı cevap.
- **S11 – Delil tespiti:** HMK m.400–403 ve İYUK m.58 bütünlüklü aktarılmış. En iyi cevap.
- **S7 – İstinaf/temyiz:** Üç aşamalı yargılama yapısı doğru açıklanmış.

**Zayıf ve sorunlu cevaplar:**
- **S4 – Hak düşürücü süre:** Cevap içinde Devanagari karakter var: "जबकि zamanaşımı bir hakkın...". Bu, Anayasa testindeki Çince karakter sorunuyla aynı; model çıktısına yabancı dil token'ı karışıyor. Güven kaybettiren ciddi bir teknik hata.
- **S5 – HAGB:** Getirilen 5 kaynağın tamamı 9.HD ve 10.HD temyiz onama kararları — hiçbirinde HAGB geçmiyor. Model TCK m.231'i tamamen kendi ön bilgisinden anlatıyor.
- **S6 – Adli sicil:** En kısa cevap (474 karakter), model kaynakların yetersiz olduğunu kabul ediyor ama yanlış kanun referansı veriyor (bkz. Bölüm 4).
- **S9 – Avukatsız dava:** Cevap muğlak, "bazı davalarda zorunlu olabilir" diyor ama hiçbir somut kural vermiyor. Getirilen kaynaklar arabuluculuk kararları, avukat zorunluluğuyla ilgisi yok.
- **S12 – Uzlaştırma:** Kaynakların tamamı trafik kazası/zamanaşımı kararları. Model CMK m.253'ü kendi bilgisinden aktarıyor ama avantajlar listesi yüzeysel.

**Mekanik uyarı sorunu:** Tüm cevaplarda "Bu konu profesyonel hukuki destek gerektirmektedir" uyarısı var. S7 (istinaf-temyiz farkı) veya S11 (delil tespiti nedir) gibi genel bilgi sorularında bu uyarı orantısız.

---

## 3. Kaynak Alaka Düzeyi (Context Precision) — 5 / 10

Skor dağılımı Anayasa testine kıyasla belirgin biçimde daha iyi; ancak ciddi boşluklar var.

**Mükemmel retrieval:**

| Soru | Getirilen Kaynaklar |
|---|---|
| S8 – İhtiyati tedbir | HMK m.390, m.391, m.393, m.396, m.397 — tam isabet |
| S11 – Delil tespiti | HMK m.400, m.401, m.402, m.403 + İYUK m.58 — tam isabet |

**Kısmi retrieval (fonksiyonel):**

| Soru | Durum |
|---|---|
| S2 – İcra takibi | İİK m.35, m.57, m.103, m.50, m.158 — ilgili, ancak m.158 iflas prosedürüne ait |
| S3 – Zamanaşımı | TBK m.146, m.156 doğrudan ilgili; 4857 m.32 kısmi; TBK m.353 kira uzatması alakasız |
| S7 – İstinaf/temyiz | 10.HD + 4.HD kararları + HMK m.345 + İİK m.164 — genel tablo doğru ama İİK m.164 iflas mahkemesi özelinde |

**Başarısız retrieval:**

| Soru | Beklenen | Getirilen |
|---|---|---|
| S5 – HAGB | TCK m.231, CMK m.223 | 9.HD + 10.HD temyiz onama kararları (HMK/HUMK m.428-439) |
| S6 – Adli sicil | 5352 sayılı Adli Sicil K. | 9.HD temyiz onama kararları (HMK m.371) |
| S9 – Avukatsız dava | 6100 HMK, 1136 Av.K. m.35 | 9.HD arabuluculuk kararları (6325 K. m.18/A) |
| S12 – Uzlaştırma | CMK m.253 | 4.HD hatır taşıması tazminat kararları |

**Ortalama kaynak skoru:** Genel olarak 0.84–0.88 bandında, ancak S5, S12 için 0.82–0.84'e düşüyor. Bu, veritabanında Ceza Usul Hukuku ve idari sicil dokümanlarının yetersizliğine işaret ediyor.

---

## 4. Halüsinasyon (Faithfulness) — 5 / 10

Kaynak-cevap uyumu Anayasa testine göre daha iyi ama kritik sorunlar mevcut.

**Doğrulanan sorunlar:**

- **S4 — Devanagari karakter:** Cevap içinde "जबकि zamanaşımı bir hakkın..." ifadesi var. Anayasa testindeki Çince karakter sorunuyla aynı köken — model bağlam tamponuna yabancı dil token'ı sızıyor. Bu sistemik bir sorun.
- **S5 — Kaynak yok, cevap üretildi:** Tüm kaynaklar temyiz onama paragrafları; model TCK m.231 HAGB'yi tamamen kendi bilgisinden anlatıyor. İçerik büyük ölçüde doğru görünse de bu, faithfulness değil — denetlenemiyor.
- **S6 — Yanlış kanun referansı:** Model "5271 sayılı Ceza Muhakemesi Kanunu'na göre" diyor. Oysa adli sicil kaydının silinmesini düzenleyen kanun **5352 sayılı Adli Sicil Kanunu**'dur. Ciddi hata; kullanıcı yanlış kanunu araştırmaya yönlendirilir.
- **S9 — Muğlak ve eksik:** Avukat zorunluluğunun hangi davalarda geçerli olduğu açıklanmıyor. "Bazı kompleks veya yüksek miktarlı davalarda" gibi belirsiz ifadeler somut bir hukuki dayanağa bağlanmıyor.
- **S12 — Kaynak yok, cevap üretildi:** Uzlaştırma kaynakları trafik kazası tazminatı; model CMK m.253'ü kendi bilgisinden anlatıyor. Kaynak paragrafları hiçbiri uzlaştırmayla ilgili değil.

**Olumlu:**
- S2, S8, S11'de model kaynakları doğrudan alıntılamış ve madde numaraları doğru.
- S3'te TBK m.154 (zamanaşımının kesilmesi) ve m.146 (genel süre 10 yıl) kaynakla örtüşüyor.
- "Bu konu profesyonel hukuki destek gerektirmektedir" uyarısı tutarlı biçimde mevcut.

---

## Özet Skor Tablosu

| Soru | Kategori Tespit | Cevap Kalitesi | Kaynak Alaka | Halüsinasyon Yokluğu | Genel |
|---|---|---|---|---|---|
| S1 – Arabuluculuk | 0/10 | 7/10 | 6/10 | 7/10 | 5/10 |
| S2 – İcra takibi | 0/10 | 7/10 | 8/10 | 8/10 | 5.75/10 |
| S3 – Zamanaşımı | 0/10 | 7/10 | 7/10 | 7/10 | 5.25/10 |
| S4 – Hak düşürücü süre | 0/10 | 5/10 | 5/10 | 4/10 | 3.5/10 |
| S5 – HAGB | 0/10 | 5/10 | 1/10 | 4/10 | 2.5/10 |
| S6 – Adli sicil kaydı | 0/10 | 3/10 | 1/10 | 3/10 | 1.75/10 |
| S7 – İstinaf/temyiz | 0/10 | 7/10 | 6/10 | 7/10 | 5/10 |
| S8 – İhtiyati tedbir | 0/10 | 9/10 | 10/10 | 9/10 | 7/10 |
| S9 – Avukatsız dava | 0/10 | 4/10 | 2/10 | 4/10 | 2.5/10 |
| S10 – Yargılama giderleri | 0/10 | 6/10 | 6/10 | 6/10 | 4.5/10 |
| S11 – Delil tespiti | 0/10 | 9/10 | 10/10 | 9/10 | 7/10 |
| S12 – Uzlaştırma | 0/10 | 5/10 | 1/10 | 4/10 | 2.5/10 |
| **ORTALAMA** | **0/10** | **6.2/10** | **5.3/10** | **6/10** | **4.4/10** |

---

## İyileştirme Önerileri

### En kritik 3 sorun

**1. Kategori sınıflandırıcısı "Usul Hukuku" etiketini üretemiyor.** Tüm 12 soru yanlış sınıflandırıldı. Bu, Anayasa Hukuku testinde de yaşanan sorunla aynı köken: etiket kümesinde eksik kategori ya da sınıflandırıcı bu etiketi hiç öğrenmemiş. "Genel Hukuk"un 9/12 soru için fallback gibi kullanılması, sistemin bilinmeyeni her zaman bu etikete atadığını gösteriyor. Çözüm: Sınıflandırıcıya Usul Hukuku örnekleri (HMK soruları, delil tespiti, istinaf/temyiz, ihtiyati tedbir) ekleyerek yeniden eğitmek; ya da LLM tabanlı zero-shot sınıflandırmaya geçmek.

**2. Yabancı dil karakter sızıntısı sistemik bir sorun.** S4'te Devanagari (Hindi) karakter, Anayasa S11'de Çince karakter çıkması, bu durumun tek seferlik olmadığını kanıtlıyor. Model bağlam tamponuna (context window) başka dilden token'lar karışıyor. Bu, son kullanıcı açısından uygulamanın güvenilirliğini kökten zedeliyor. Çözüm: Cevap üretim sonrası Unicode kategori kontrolü (Devanagari/CJK blokları için regex filtresi); hata tespitinde bu cevabı "yeniden üret" ya da "hata bildir" akışına yönlendirmek.

**3. Ceza Usul Hukuku ve idari sicil konularında vektör tabanı boş.** S5 (HAGB), S6 (adli sicil), S12 (uzlaştırma) için Qdrant'tan ilgili hiçbir kaynak gelmedi. Model kendi bilgisiyle doldurdu — bu denetimsiz ve riskli. S6'da yanlış kanun numarası (5271 yerine 5352) bunun somut zararıdır. Çözüm: Ceza Muhakemesi Kanunu (CMK) maddeleri, 5352 sayılı Adli Sicil Kanunu, ve uzlaştırma mevzuatı vektör tabanına eklenmeli.

### Retrieval iyileştirilmesi gereken kategoriler

Öncelik sırası en acilden:

- **Ceza Usul Hukuku** — 5271 sayılı CMK (HAGB, uzlaştırma, tutukluluk, bozma) ve 5352 sayılı Adli Sicil Kanunu madde bazında chunk'lanarak eklenmeli.
- **Usul Hukuku genel** — 6100 HMK retrieval'ı kısmen çalışıyor (S8, S11 iyi); ancak "Usul Hukuku" kategori etiketi olmadığı için yanlış index'ten sorgulanıyor. Kategori düzeltilirse mevcut HMK verisi daha verimli kullanılacak.
- **Avukatlık/Temsil** — 1136 sayılı Avukatlık Kanunu maddeleri (m.35, m.35/A, m.76) ve zorunlu temsil gerektiren özel kanunlar (İdari Yargılama K., CMK) eklenmeli.

### Generator prompt'u düzeltilmesi gereken kategoriler

- **Kaynak yokken susma talimatı acil:** S5 ve S12'de model kaynaksız cevap üretti. Prompt'a "getirilen kaynaklar bu soruyu yanıtlamaya yetmiyorsa ve LLM bilginden yararlanıyorsan, bunu açıkça belirt ve hangi kanunun geçerli olduğunu söyle ama ayrıntılı bilgi verme" talimatı eklenmeli.
- **Kanun adı doğrulama talimatı:** S6'daki "5271 sayılı CMK" hatası gibi durumlarda, model adli sicil = CMK gibi yanlış eşleşme yapabiliyor. Prompt'a "kanun numarasını kaynaklarda göremiyorsan yalnızca kanun adını ver, numarayı tahmin etme" kısıtı eklenmeli.
- **Uyarı koşullulaştırması:** "Bu konu profesyonel hukuki destek gerektirmektedir" uyarısını genel bilgi sorularında (S7, S11 gibi) kaldırmak ya da sadece bireysel hukuki tavsiye istendiğinde tetiklemek. Mevcut hâliyle her cevabın sonunda yer alması uyarının anlamını yitirmesine yol açıyor.

### Vektör tabanına eklenmesi gereken hukuk alanları

Mevcut veri setinin ağırlıklı olarak Yargıtay 9. HD ve 4. HD iş/özel hukuk kararlarından oluştuğu anlaşılıyor. HMK maddeleri kısmen mevcut (S8 ve S11 bunu kanıtlıyor) ama eksik kategoriler:

- **5271 sayılı CMK** — HAGB (m.231), uzlaştırma (m.253-255), tutukluluk (m.100-108), delil ve ispat bölümleri
- **5352 sayılı Adli Sicil Kanunu** — silinme ve arşive alınma koşulları (m.9-12)
- **1136 sayılı Avukatlık Kanunu** — zorunlu temsil, uzlaşma sağlama, disiplin hükümleri
- **2576 / 2575 sayılı Bölge İdare ve Danıştay Kanunları** — idari yargı usulü
- **Yargıtay Büyük Genel Kurul kararları** — usuli kazanılmış hak, ıslah, kesinlik sınırı gibi temel usul ilkelerine dair içtihat birleştirme kararları
- **Anayasa Mahkemesi kararları (AYM)** — özellikle HMK ve CMK maddelerine yönelik iptal kararları; HAGB'nin anayasaya aykırılık sürecine ilişkin kararlar dahil
