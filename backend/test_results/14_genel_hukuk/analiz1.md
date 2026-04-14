Aşağıda detaylı değerlendirmem yer alıyor. Önce özet görseli, ardından detaylı analiz.

---

## 1. Kategori Tespit Doğruluğu — 3.3 / 10

**Sonuç: Düşük ama tam başarısızlık değil.** `Diğer = Genel Hukuk` kabulüyle yeniden okunduğunda 12 sorunun 4'ü doğru, 8'i yanlış sınıflandırılmış. Güncellenmiş JSON özetinde `kategori_dogruluk_orani: 33.3` olarak görülmeli.

Tespit edilen kategoriler: Genel Hukuk (4), İdare Hukuku (2), Ceza Hukuku (2), Ticaret Hukuku (2), İş Hukuku (1), Aile Hukuku (1). Beklenen üst kategori artık **"Genel Hukuk"** olarak değerlendirilmelidir.

**Ortak patern:** Sorular kendi gerçek alt alanlarına göre değil, yüzey kelimelerine göre en yakın spesifik kategoriye itiliyor:

- Trafik soruları `Ceza Hukuku` veya `Ticaret Hukuku`na kaymış.
- Göç / yabancılar / vatandaşlık soruları `Genel Hukuk`, `Aile Hukuku` veya `İş Hukuku`na dağılmış.
- Dilekçe ve bilgi edinme gibi kamusal başvuru hakları `İdare Hukuku`na kaymış.

Bu, önceki `12_anayasa_hukuku` ve `13_usul_hukuku` analizlerinde görülen yapısal sorunun daha hafif bir versiyonu. Burada ana sorun artık `Diğer` etiketinin eksikliği değil; `Genel Hukuk`ta kalması gereken soruların gereksiz şekilde spesifik kategorilere kayması.

---

## 2. Cevap Kalitesi — 5 / 10

**Uzunluk sorunu yok.** Hiçbir cevap 200 karakterin altında ya da 5000 karakterin üstünde değil. En kısa cevap 829 karakter (S5), en uzun cevap 1839 karakter (S12). Teknik olarak "çok kısa" veya "aşırı uzun" bir çıktı yok.

**Görece güçlü cevaplar:**

- **S8 – Dilekçe hakkı**: 3071 sayılı Kanun'a dayanıyor, doğrudan ve faydalı.
- **S9 – Bilgi edinme hakkı**: 4982 sayılı Kanun maddeleriyle uyumlu, formel olarak güçlü.
- **S2 – Trafik kazasında kusur oranı**: Kaynaklar en azından kusur-bilirkişi ekseninde ilgili; cevap akışkan.

**Zayıf cevaplar ve nedenleri:**

- **S3 – Çalışma izni**: Model kaynakların yetersiz olduğunu kabul ediyor ama yine de 6735 sayılı Uluslararası İşgücü Kanunu yerine dolaylı ve zayıf bir anlatı kuruyor. Soruya tam yanıt vermiyor.
- **S4 – İkamet izni**: Cevap genel doğrultuda mantıklı görünse de kaynak desteği yok; ayrıca metin içinde Çince karakter sızıntısı (`daha詳...`) var.
- **S5 – Vize ihlali**: Doğrudan yanlış madde ve muhtemelen yanlış ceza aralığı veriyor. Bu, cevap kalitesini ciddi biçimde düşürüyor.
- **S6 – Vatandaşlık / yatırım yoluyla vatandaşlık**: Cevap biçimsel olarak düzenli ama yatırım eşikleri güncel değil; bu nedenle güvenilmez.
- **S7 – Deport itirazı**: Süreyi kısmen doğru söylese de başvurulacak merciyi yanlış kuruyor; idari itiraz ile yargı yolunu karıştırıyor.
- **S10 – E-devlet işlemleri**: UYAP, SGK, EKAP ve e-imza ekseninde geniş bir çerçeve çiziyor ama "e-Devlet portalında vatandaşın fiilen yapabildiği işlemler" ile "kamunun genel elektronik işlem altyapısı"nı birbirine karıştırıyor.
- **S11 – Noter vekâletnamesi**: Kısmen doğru bir çekirdek var, ancak vesayet ve vasiyet gibi konuları "noter vekâletnamesinin zorunlu olduğu haller" gibi sunarak kavramları karıştırıyor.
- **S12 – Aile birleşimi vizesi**: Cevap tamamen jenerik; Türkiye özelinde hangi mevzuata dayanacağı net değil. "Hak-Bul" bağlamı açısından fazla soyut ve ülke-bağımsız kalmış.

**Alt alan bazında en zayıf grup:** Göç / yabancılar / vatandaşlık ekseni. S3, S4, S5, S6, S7 ve S12 aynı alt temada ve neredeyse tamamında ya retrieval kopmuş ya da model kaynaksız genelleme yapmış.

**Uyarı kullanımı:** 12 cevabın tamamında "Bu konu profesyonel hukuki destek gerektirmektedir" cümlesi var. S1, S5, S6, S7 gibi idari yaptırım veya statü kaybı riski olan sorularda bu uyarı anlaşılabilir. Ancak S8, S9 ve kısmen S10 gibi genel bilgi sorularında mekanik ve gereksiz duruyor.

---

## 3. Kaynak Alaka Düzeyi (Context Precision) — 4 / 10

**Metrik yanılgısı var:** Ortalama kaynak skoru tüm sorularda 0.80-0.89 bandında. Yani `ortalama_kaynak_skor < 0.7` olan **hiçbir soru yok**. En düşük skor bile yalnızca **S12 = 0.8034**. Buna rağmen içeriksel alaka birçok soruda zayıf. Bu, mevcut skorlamanın semantik kaliteyi iyi ayıramadığını gösteriyor.

**İsabetli retrieval örnekleri:**

- **S8 – Dilekçe hakkı**: 3071 sayılı Kanun m.2, m.3, m.8 doğrudan ilgili.
- **S9 – Bilgi edinme hakkı**: 4982 sayılı Kanun m.6, m.7, m.26 doğrudan ilgili.
- **S2 – Kusur oranı**: 4. HD kaynakları kusur ve bilirkişi raporu ekseninde soruya en azından temas ediyor.

**Başarısız retrieval örnekleri:**

| Soru | Beklenen kaynak tipi | Getirilen kaynaklar |
|---|---|---|
| S1 – Trafik cezasına itiraz | Kabahatler Kanunu m.27, trafik idari para cezası usulü | Trafik kazası ve ceza zamanaşımı ağırlıklı 4. HD kararları |
| S3 – Çalışma izni | 6735 sayılı Uluslararası İşgücü Kanunu, ÇSGB çalışma izni süreci | İş Kanunu, TMK, SGK ve İŞKUR parçaları |
| S4 – İkamet izni | 6458 sayılı YUKK ikamet hükümleri | 4. HD kararı, TTK m.665, İİK m.10 |
| S5 – Vize ihlali | 6458 sayılı YUKK giriş, vize, sınır dışı ve para cezası hükümleri | İş hukuku ve zamanaşımı parçaları |
| S6 – Vatandaşlık | 5901 sayılı Kanun, uygulama yönetmeliği, NVI/TKGM kaynakları | DMK m.48, SPK m.42, Anayasa m.66 |
| S7 – Deport | 6458 sayılı YUKK m.52-57 | Sendikal yetki ve yargılamanın iadesi içerikli 9. HD kararları |
| S10 – E-devlet | E-Devlet kapısı / UYAP kullanıcı işlemleri / özgül mevzuat | HMK UYAP, SGK elektronik belge, EKAP |
| S11 – Noter vekâletnamesi | Noterlik mevzuatı, HMK temsil, Avukatlık Kanunu | HMK m.76 yanında TMK vesayet ve HMK m.206 |
| S12 – Aile birleşimi vizesi | YUKK aile ikamet izni, dış temsilcilik süreci | Harç, vekâlet ücreti ve iş hukuku içtihat kırıntıları |

**Kaynak güncelliği / doğruluğu açısından not:**

- S6'da yatırım yoluyla vatandaşlık için getirilen kaynaklar güncel ve doğru mevzuatı taşımıyor.
- S3-S7-S12 bandında sistem, göç ve yabancılar hukukuna dair birincil mevzuatı neredeyse hiç getiremiyor.
- Bu nedenle sorun yalnızca "yanlış belge" değil, aynı zamanda **eksik belge havuzu** ve **yanlış indeks yönlendirmesi** olabilir.

---

## 4. Halüsinasyon (Faithfulness) — 3.5 / 10

Bu test setinde en ciddi sorun burada. Model, kaynaklar yetersiz kaldığında cevap vermeyi durdurmuyor; bunun yerine kendi genel bilgisini devreye sokup hukuki detay üretmeye devam ediyor.

**Doğrulanmış sorunlar:**

- **S1 – Trafik cezasına itiraz:** 15 günlük süre bilgisi genel olarak doğru görünse de başvurunun "ilgili idareye yazılı olarak veya elektronik ortamda yapılacağı" ifadesi hatalı / en azından yanıltıcı. Kabahatler Kanunu m.27 bağlamında asıl yargısal başvuru sulh ceza hâkimliğine yapılır. Kaynaklar da zaten bu usulü desteklemiyor.
- **S4 – İkamet izni:** Kaynaklar alakasız olmasına rağmen model süreç anlatıyor ve metne Çince karakter sızıyor (`daha詳...`). Bu, içerik üretiminin kaynaktan kopuk olduğunu gösteren net bir teknik işaret.
- **S5 – Vize ihlali:** En ciddi somut hata. Resmî Göç İdaresi metninde 6458 sayılı Kanun'un **m.102** hükmü idari para cezalarını düzenliyor; **m.108** artık bu konuya ilişkin bir norm değil. Ayrıca modelin verdiği "1.000 TL ile 5.000 TL arası" genellemesi, mevcut m.102 sistematiğiyle uyumlu değil.
- **S6 – Yatırım yoluyla vatandaşlık:** Modelin yazdığı eşikler güncel değil. Resmî NVI/TKGM kaynaklarında taşınmaz için **en az 400.000 USD**, sabit sermaye / mevduat için **en az 500.000 USD**, istihdam için **en az 50 kişi** eşiği görülüyor. Model ise eski rejime ait görünen 250.000 USD / 1.000.000 USD gibi değerler veriyor.
- **S7 – Deport itirazı:** Resmî YUKK m.53/3'e göre sınır dışı etme kararına karşı **tebliğden itibaren 15 gün içinde idare mahkemesine** başvurulur. Model süreyi 15 gün olarak söylemiş olsa da "kararı veren makama itiraz" şeklinde anlatarak forumu yanlış kuruyor.
- **S11 – Noter vekâletnamesi:** Vekâletname ile vasiyetname / vesayet bildirim yükümlülüğü gibi farklı kurumlar birbirine karıştırılıyor. Bu, kaynağın izin verdiğinden fazla genişletilmiş bir anlatı.
- **S12 – Aile birleşimi vizesi:** Kaynak yok; cevap tamamen jenerik. Faithfulness açısından en zayıf kayıtlardan biri.

**Olumlu taraf:**

- S8 ve S9'da model büyük ölçüde kaynağa sadık kalmış.
- S2'de kusur oranı ve bilirkişi raporu anlatısı, kaynaklarla kısmen örtüşüyor.

**Profesyonel destek uyarısı uygun mu?**

- **Uygun / makul:** S1, S5, S6, S7, S12
- **Aşırı / gereksiz:** S8, S9, S10

Sorun, uyarının var olması değil; koşulsuz ve otomatik eklenmesi. Bu durum uyarıyı hukukî risk sinyalinden çok şablon metne dönüştürüyor.

---

## Özet Skor Tablosu

Not: Bu test setinde tek beklenen üst kategori `Genel Hukuk` olarak ele alınmıştır. Alt alan farklılıkları yukarıdaki bölümlerde ayrıca yorumlandı.

| Kategori | Kategori Tespit | Cevap Kalitesi | Kaynak Alaka | Halüsinasyon Yokluğu | GENEL |
|---|---|---|---|---|---|
| Genel Hukuk | 3.3/10 | 5/10 | 4/10 | 3.5/10 | 3.95/10 |

---

## İyileştirme Önerileri

### En kritik 3 sorun

**1. Genel hukuk soruları gereksiz şekilde spesifik kategorilere kayıyor.**  
`Diğer = Genel Hukuk` kabulünden sonra kök sorun, etiketin hiç üretilmemesi değil; trafik, göç ve başvuru hakkı sorularının yüzey kelimeleri nedeniyle `Ceza`, `İdare`, `Ticaret` veya `Aile Hukuku`na sürüklenmesi. Çözüm: `Genel Hukuk` için koruyucu alias/öncelik kuralları ve test-script normalizasyonu uygulanmalı.

**2. Göç / yabancılar / vatandaşlık retrieval katmanı yetersiz.**  
S3, S4, S5, S6, S7 ve S12'de birincil mevzuat neredeyse hiç gelmiyor. Bu, tekil hata değil; veri seti ve indeks yönlendirme problemi. Çözüm: 6458, 5901, 6735 ve bu alanlara ilişkin uygulama metinleri ayrı ve iyi etiketlenmiş chunk'lar halinde eklenmeli.

**3. Generator kaynaksız hukuki detay uyduruyor.**  
S5'te yanlış madde, S6'da eski yatırım eşikleri, S7'de yanlış başvuru merci, S11'de kurum karışıklığı var. Çözüm: prompt'a "kaynakta geçmeyen madde numarası, süre, para cezası ve eşik yazma" kuralı eklenmeli. Kaynak yetersizse model açıkça "bu bilgi getirilen kaynaklarda yok" diyerek sınırlı cevap vermeli.

### Retrieval iyileştirilmesi gereken alanlar

Öncelik sırası:

- **Göç ve yabancılar hukuku**: 6458 sayılı YUKK (vize, ikamet, sınır dışı, aile ikamet izni, idari para cezası)
- **Vatandaşlık hukuku**: 5901 sayılı Türk Vatandaşlığı Kanunu ve uygulama yönetmeliği
- **Uluslararası işgücü / çalışma izni**: 6735 sayılı Uluslararası İşgücü Kanunu ve ÇSGB başvuru süreçleri
- **Noterlik ve temsil işlemleri**: Noterlik mevzuatı, HMK temsil hükümleri, Avukatlık Kanunu
- **Vatandaşın idareye başvuru hakları**: 3071 ve 4982 iyi görünüyor; bu alan görece güçlü

### Generator prompt'u düzeltilmesi gereken alanlar

- **Göç / vatandaşlık soruları** için: süre, para cezası, başvuru makamı, yatırım eşiği gibi rakamsal bilgileri yalnızca kaynakta varsa üret.
- **Kaynak yetersizliği modu** eklenmeli: "Kaynaklar bu soruyu karşılamıyorsa genel yönlendirme yap, ancak madde numarası ve tutar tahmini yapma."
- **Uyarı koşullulaştırılmalı**: Profesyonel destek uyarısı sadece statü kaybı, yaptırım, sınır dışı, vatandaşlık kaybı, ceza riski veya somut işlem tavsiyesi içeren sorularda otomatik eklensin.
- **Unicode / karakter filtresi** eklenmeli: Çince veya başka yabancı karakter sızıntısı tespit edilirse çıktı yeniden üretilsin.

### Vektör veritabanına eklenmesi gereken hukuk alanları

- **6458 sayılı Yabancılar ve Uluslararası Koruma Kanunu** madde bazlı chunk'lar
- **5901 sayılı Türk Vatandaşlığı Kanunu** ve uygulama yönetmeliği
- **6735 sayılı Uluslararası İşgücü Kanunu**
- **Göç İdaresi Başkanlığı** resmî uygulama rehberleri
- **Nüfus ve Vatandaşlık İşleri Genel Müdürlüğü** vatandaşlık başvuru içerikleri
- **Çalışma ve Sosyal Güvenlik Bakanlığı** çalışma izni başvuru ve değerlendirme sayfaları
- **Noterlik işlemleri / vekâletname** konusunda birincil mevzuat ve uygulama notları

Sonuç olarak bu test setinde sistemin en güçlü olduğu alan, kamusal başvuru hakları (`dilekçe`, `bilgi edinme`) oldu. En zayıf alan ise açık biçimde **göç, yabancılar ve vatandaşlık hukuku**. Bu zayıflık hem retrieval tarafında hem de generator tarafında aynı anda görülüyor; dolayısıyla yalnızca prompt düzeltmesi yetmez, veri tabanı ve kategori yönlendirme katmanı birlikte ele alınmalı.
