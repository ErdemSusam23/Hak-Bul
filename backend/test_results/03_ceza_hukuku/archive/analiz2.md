Aşağıda detaylı değerlendirmem yer alıyor.

---

## Genel Değerlendirme

12 sorudan 10'u doğru kategoriye atandı (83.3%). Kategorilendirme katmanı bu test setinde görece güçlü. Ancak cevap kalitesi ve kaynak isabeti ciddi sorunlar barındırıyor. Kaynak skorları neredeyse tamamında 1.0 görünüyor; fakat içerik incelenince getirilen maddelerin büyük çoğunluğunun soruyla ilgisiz olduğu ortaya çıkıyor. Bu durum, mevcut embedding skorlama sisteminin alaka kalitesini ölçemediğini gösteriyor. En kritik sorun ise generator katmanında: model kaynakta olmayan madde numaraları ve hukuki kurumlar üretiyor, bunların başında **S8'deki HAGB – TCK m.191 karışıklığı** geliyor.

---

## 1. Kategori Tespit Doğruluğu — 8.3 / 10

**Sonuç: İyi ama iki somut hata var.** 12 sorudan 10'u doğru etiketlenmiş (83.3%).

Yanlış sınıflandırılan sorular:

- **S8 – HAGB (Hükmün Açıklanmasının Geri Bırakılması)**: `Usul Hukuku` etiketlenmiş. HAGB, CMK m.231'de düzenlenmiş olsa da uygulama alanı, koşulları ve tartışma bağlamı itibarıyla bir ceza hukuku kurumudur. Tespit katmanı muhtemelen "hüküm açıklanması" ve "geri bırakma" ifadelerini usul kavramlarıyla ilişkilendirdi.
- **S10 – Sabıka kaydı silinmesi**: `Genel Hukuk` etiketlenmiş. Sabıka kaydı 5352 sayılı Adli Sicil Kanunu'na tabidir ve doğrudan ceza hukukunun alana girer.

**Ortak patern:** Ceza hukukunun usul boyutuna temas eden sorular (HAGB, yargılama aşaması, sicil) `Usul Hukuku` veya `Genel Hukuk`a kayıyor. Bu kayma, soru metnindeki yüzey kelimelerinin kategori kararını belirlemesi sonucunda oluşuyor.

**Güçlü sınıflandırma örnekleri:** S7 (uyuşturucu kullanma), S11 (meşru savunma), S12 (uzaklaştırma kararı ihlali) gibi ceza hukuku içi özelleşmiş konularda model hiç şaşırmamış.

---

## 2. Cevap Kalitesi — 5 / 10

**Uzunluk sorunu sınırda.** Hiçbir cevap 5000 karakterin üstünde değil. Ancak S11 (331 karakter), S10 (381 karakter) ve S5 (469 karakter) ciddi derecede kısa; bu sorular için yeterli içerik üretilmemiş.

**Görece güçlü cevaplar:**

- **S7 – Uyuşturucu kullanımı ilk yakalanma**: TCK m.191 kaynakta var ve model bunu doğru kullanmış; erteleme ve denetimli serbestlik anlatısı büyük ölçüde doğru.
- **S9 – Adli para cezası ödenmeme**: m.52 kaynakta var, cevap mantıklı ve soruyu doğrudan yanıtlıyor.
- **S6 – Trafik taksirle yaralama**: 2918 sayılı KTK maddeleri getirilmiş, cevap süreç anlatısı olarak akışkan; ancak TCK m.89 (taksirle yaralama) getirilememiş.

**Zayıf cevaplar ve somut sorunlar:**

- **S1 – Hakaret şikayeti**: Model "kaynaklar arasında TCK'nın ilgili maddeleri bulunmamaktadır" diyor; oysa TCK m.125 kaynaklar arasında mevcuttu. Bu hatalı bir değerlendirme. Ayrıca "sulh ceza hakimliğine şikayet yapılır" ifadesi yanlış — şikayet Cumhuriyet Başsavcılığına yapılır.
- **S2 – Tehdit suçu**: "Kaynaklar arasında tehdit suçuna ilişkin madde yok" diyor; aslında TCK m.106 kaynaklar listesinde yer almıyor (bu retrieval hatası), ama model yine de m.106'ya atıf yaparak ceza aralığı söylüyor. Kaynak olmadan üretilmiş bilgi.
- **S5 – Kasten yaralama şikayet süresi**: Model "ilgili maddeler kaynakta yok" diyerek cevap üretmiyor. Bu dürüst bir kabul, ancak TCK m.86-88 ve m.73 (şikayet süresi) hakkında en azından genel yönlendirme yapılabilirdi.
- **S8 – HAGB**: Model "TCK m.191'de düzenleniyor" diyor — bu ciddi bir faktik hata. HAGB, **CMK m.231**'de düzenleniyor. Ayrıca HAGB'nin koşullarını m.191 (uyuşturucu) özelinde anlatmış, genel uygulamasını görmezden gelmiş.
- **S10 – Sabıka kaydı silinmesi**: Retrieval tamamen çökmüş, kaynaklar alakasız; model "bilgi bulunmamaktadır" diyerek soruyu yanıtsız bırakıyor. 5352 sayılı Adli Sicil Kanunu m.9-12 bu sorunun doğrudan cevabıdır.
- **S11 – Meşru savunma**: 331 karakterlik cevap sadece m.27'yi (sınır aşımı) ele alıyor. Soruyu soran kişi "hangi şartlarda ortadan kaldırır?" diye soruyor; asıl cevap TCK **m.25**'te. Model m.25 yerine m.27 üzerinden anlatıp soruyu yanlış temelde yanıtlamış.
- **S12 – Uzaklaştırma kararı ihlali**: "Kaynaklar yeterli bilgi sağlamamaktadır" diyerek boş cevap. Oysa **6284 sayılı Kanun m.20**'de uzaklaştırma kararının ihlali halinde 3 ila 10 gün zorlama hapsi öngörülmektedir.

**Uyarı kullanımı:** 12 sorunun tamamında ALO 182 yönlendirmesi var. S4, S9 gibi genel bilgi niteliğindeki sorularda bu uyarı mekanik duruyor; S8 ve S12 gibi yaptırım riski içerenlerde ise anlaşılabilir.

---

## 3. Kaynak Alaka Düzeyi (Context Precision) — 3.5 / 10

**Metrik yanılgısı kritik derecede büyük.** S10 dışındaki tüm sorularda ortalama kaynak skoru 1.0. Buna rağmen aşağıdaki tabloda görüleceği üzere pek çok sorguda getirilen kaynaklar soruyla doğrudan alakasız.

**İsabetli retrieval örnekleri:**

- **S7 – Uyuşturucu**: TCK m.188, m.191, m.192 doğrudan ilgili.
- **S9 – Adli para cezası**: TCK m.50, m.52, m.65, m.75 büyük ölçüde ilgili.
- **S6 – Trafik taksirle yaralama**: 2918 sayılı KTK m.48, m.85, m.135 ilgili; TCK m.53 de mahkumiyet sonuçları açısından kabul edilebilir.

**Başarısız retrieval örnekleri:**

| Soru | Beklenen kaynak tipi | Getirilen kaynaklar |
|---|---|---|
| S1 – Hakaret şikayeti | TCK m.125, m.127, m.73 (şikayet süresi) | Anayasa m.174, m.19, m.159; TCK m.75, m.50 |
| S2 – Tehdit suçu | TCK m.106 | TCK m.51, m.84, m.11, m.12, m.80 (insan ticareti!) |
| S4 – Sosyal medya hakaret | TCK m.125-131, 5651 sk. içerik kaldırma | 5651 sk. m.12 (kamu görevlisi veri aktarımı — alakasız), HMK m.297 |
| S5 – Kasten yaralama şikayet süresi | TCK m.86-88, m.73 | TCK m.106, m.104, m.105, m.108 (cinsel suçlar ve tehdit!) |
| S8 – HAGB | CMK m.231, TCK m.51 genel koşullar | TBK m.331, m.351 (kira mevzuatı!), TCK m.17 |
| S10 – Sabıka kaydı | 5352 sayılı Adli Sicil Kanunu m.9-12 | TBK m.134, SGK m.41, FSK m.53, TTK m.415 |
| S11 – Meşru savunma | TCK m.25, m.26, m.27 | 5651 sk. m.12, TTK m.1533 (münfesih şirketler!), TMK m.1001 |
| S12 – Uzaklaştırma ihlali | 6284 sk. m.20 (zorlama hapsi) | Anayasa m.174, TCK m.51, m.191, m.221, m.267 |

**Kaynak güncelliği / doğruluğu:**

- S5'te getirilen TCK m.108 metni içinde 4/6/2025 tarihli 7550 sayılı Kanun değişikliği geçiyor — bu güncel bir kaynak. Ama soru kasten yaralama, m.108 ise cebren yaralama — yanlış madde.
- S10'da skor 0.06-0.07 bandına düşmüş; sistem vektörde 5352 sayılı Adli Sicil Kanunu'nu bulamadığını açıkça gösteriyor.

**Yapısal sorun:** Bazı maddeler (TCK m.11, m.12, m.51, m.84) birçok farklı soruda tekrarlı geliyor. Bu, retrieval'ın "en popüler" veya "en çok eşleşen" maddeleri döndürdüğünü, sorguya özgü ilgili maddeleri seçemediğini gösteriyor.

---

## 4. Halüsinasyon (Faithfulness) — 4 / 10

Bu test setinde halüsinasyon profili ikiye ayrılıyor: bazı sorularda model doğru cevabı kaynaksız üretiyor (implicit hallucination), bazılarında ise yanlış madde atfı gibi somut faktik hatalar var.

**Doğrulanmış somut hatalar:**

- **S1 – Hakaret şikayeti**: "Sulh ceza hakimliğine şikayet yapılabilir" — yanlış. Şikayet Cumhuriyet Başsavcılığına yapılır; sulh ceza hakimliği soruşturma sonrası gündeme girer.
- **S3 – İnternet dolandırıcılığı**: Model "TCK m.159'a göre dolandırıcılık" diyor. TCK m.159, dolandırıcılığın özel bir hali (alacak tahsil amacıyla). Genel internet dolandırıcılığı için esas norm TCK **m.157-158**'dir. Yanlış madde seçimi.
- **S8 – HAGB**: "HAGB, TCK m.191. maddesinde düzenleniyor" — **tamamen yanlış.** HAGB CMK m.231'de düzenleniyor; TCK m.191 uyuşturucu kullanımını düzenliyor. Bu, iki tamamen farklı kurumu birbirine karıştıran ciddi bir halüsinasyon.
- **S8 – devam**: Model HAGB koşulları arasında "sanığın daha önce kasıtlı suçtan mahkûm olmamış olması" gibi gerçek koşulları sayıyor ama bunları CMK m.231'e değil, TCK m.191'e bağlıyor. Bu, doğru bilginin yanlış kaynağa atfedilmesi.
- **S11 – Meşru savunma**: Soru "meşru savunmanın şartları"nı soruyor; model yalnızca TCK m.27'yi (sınırın aşılması) ele alıyor. Meşru savunmanın asıl koşullarını düzenleyen TCK **m.25** hiç geçmiyor. Bu, soruyu yarı yanıtlayarak yanıltıcı bilgi vermek anlamına gelir.
- **S12 – Uzaklaştırma ihlali**: 6284 sayılı Kanun m.20'ye göre ihlal halinde 3 ila 10 gün zorlama hapsi öngörülüyor. Model bu kritik bilgiyi vermiyor; kaynakların yetersizliğini söyleyerek genel yönlendirmeyle kaçıyor. Kaynak eksikliği doğru tespiti ama sorunun cevabı açıkça mevzuatta var.

**Görece doğru / kaynaklara sadık cevaplar:**

- S7, S9 kaynakları makul ölçüde kullanmış.
- S4 (sosyal medya hakaret delilleri) madde atıflarına girmeden pratik rehber sunmuş — bu, halüsinasyon riskini düşürmüş.

**Profesyonel destek uyarısı değerlendirmesi:**

- **Uygun:** S1, S5, S8, S12 (yaptırım, süreç, statü riski içeriyor)
- **Makul:** S6, S7, S3
- **Gereğinden fazla / mekanik:** S4, S9, S11 (genel bilgi sorular, avukat yönlendirmesi şablon gibi duruyor)

---

## Özet Skor Tablosu

| Kategori | Kategori Tespit | Cevap Kalitesi | Kaynak Alaka | Halüsinasyon Yokluğu | GENEL |
|---|---|---|---|---|---|
| Ceza Hukuku | 8.3/10 | 5/10 | 3.5/10 | 4/10 | 5.2/10 |

---

## İyileştirme Önerileri

### En kritik 3 sorun

**1. Generator yanlış madde numarası üretiyor.**  
S8'de HAGB için TCK m.191 atfı, S3'te m.159 seçimi, S1'de başvuru mercii yanlışı bunun açık kanıtı. Sorun prompt yapısında: model kaynakta olmayan bilgiyi kendi genel bilgisinden dolduruyor ve yanlış norm seçiyor. Çözüm: prompt'a "Kaynakta geçmeyen madde numarası ve kurumsal atıf yapma; bunun yerine 'bu bilgi kaynakta yer almıyor' de" kuralı eklenmeli.

**2. Ceza hukukunun kritik mevzuatı vektör veritabanında eksik.**  
S10 (sabıka — 5352 sayılı Adli Sicil Kanunu), S12 (uzaklaştırma — 6284 sayılı Kanun), S5 (kasten yaralama — TCK m.86-88) için birincil kaynaklar hiç gelmiyor. Bu retrieval'ın cevap veremediği değil, veri tabanında o içeriğin olmadığını gösteriyor. Çözüm: kritik ceza mevzuatı chunk'lanarak eklenmeli.

**3. Retrieval "popüler maddeler" döngüsüne giriyor.**  
TCK m.51, m.11, m.12, m.84 birden fazla farklı soruda tekrarlı geliyor. Alakasız ama embedding benzerliği yüksek maddeler aynı skor değerini (1.0) alıyor. Bu, skoring'in içerik alaka kalitesini ölçmediğini gösteriyor. Çözüm: kaynak seçiminde kategori filtresi veya sorgu-spesifik reranking eklenmeli.

### Retrieval iyileştirilmesi gereken alanlar

Öncelik sırası:

- **Adli sicil ve sabıka**: 5352 sayılı Adli Sicil Kanunu, özellikle m.9-13 (silme, arşiv kaydı, yasak hakların geri verilmesi)
- **Aile içi şiddet ve uzaklaştırma**: 6284 sayılı Kanun, özellikle m.17-20 (koruma tedbiri, ihlal ve zorlama hapsi)
- **Kasten / taksirle yaralama**: TCK m.86-89 tam chunk'lar halinde eklenmeli
- **Hakaret ve iftira**: TCK m.125-131 (hakaret, iftira, ispat hakkı, kamu görevlisine hakaret ağırlaştırıcı) — şu anda sadece m.125 parça geliyor
- **HAGB / erteleme / seçenek yaptırımlar**: CMK m.231 ve uygulama koşulları; TCK m.50-51 ile birlikte sistematik şekilde indekslenmeli

### Generator prompt'u düzeltilmesi gereken alanlar

- **Madde numarası kısıtlaması**: "Kaynakta açıkça geçmeyen madde numarası ve fıkra belirtme; 'kaynakta yeterli bilgi yok' ifadesini kullan."
- **Başvuru mercii kontrolü**: Ceza hukukunda başvuru yerleri (Cumhuriyet Başsavcılığı, sulh ceza hakimliği, ağır ceza mahkemesi) sıklıkla karıştırılıyor. Prompt'ta "başvuru mercii bilgisini yalnızca kaynakta açıkça geçiyorsa belirt" kuralı eklenmeli.
- **HAGB tanımı düzeltilmeli**: HAGB'nin CMK m.231 kurumu olduğu, TCK değil CMK'da yer aldığı şeklinde bir özel sistem bilgisi veya kaynak eklenmeli.
- **Kısa cevap tuzağı**: S11 gibi "hangi şartlarda?" diye soran sorularda model tek bir maddeyi alıp kısa cevap vermeye yönseliyor. Prompt'ta "soruyu cevaplamak için birden fazla koşul veya madde gerekiyorsa bunların tamamını sırala" yönlendirmesi eklenmeli.

### Vektör veritabanına eklenmesi gereken hukuk alanları

- **5352 sayılı Adli Sicil Kanunu** — sabıka kaydı silme, arşiv kaydı, özel af, yasak hakların iadesi
- **6284 sayılı Ailenin Korunması ve Kadına Karşı Şiddetin Önlenmesine Dair Kanun** — koruma tedbirleri, ihlal sonuçları (m.20 zorlama hapsi)
- **TCK m.86-89** (kasten ve taksirle yaralama) — tam metinler chunk halinde
- **TCK m.125-131** (hakaret, iftira, şikayete bağlılık koşulları) — tam metinler
- **CMK m.231** (HAGB koşulları ve usulü) — ayrı ve etiketli chunk
- **TCK m.73** (şikayete tabi suçlarda süre) ve **CMK m.158** (ihbar ve şikayet usulü) — başvuru yeri ve süre soruları için kritik

Sonuç olarak bu test setinde sistem ceza hukukunun "basit suç tipleri" (uyuşturucu, dolandırıcılık, adli para cezası) konularında görece tutarlı davranıyor. Ancak kurumsal ceza hukuku kavramları (HAGB, meşru savunma koşulları, uzaklaştırma ihlali) ve alt mevzuata bağlı konularda (adli sicil, aile içi şiddet) retrieval ve generator birlikte çöküyor. Yalnızca prompt düzeltmesi bu sorunu kapsamaz; 5352 ve 6284 sayılı kanunların veri tabanına eklenmesi zorunludur.
