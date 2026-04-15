# Ceza Hukuku — Test Sonucu Analizi

**Test tarihi:** 2026-04-14  
**Kaynak dosya:** `test_sonuclari_20260414_151345.json`  
**Toplam soru:** 12 | **Başarılı API yanıtı:** 11/12 (S8 HTTP 503) | **Kategori doğruluğu:** 10/11 (%90.9)

---

## Genel Değerlendirme

Ceza Hukuku kategorisi, retrieval altyapısı açısından sistemin en zorlandığı alanlardan biri olmaya devam ediyor. Kategori tespiti güçlü (%90.9), cevap uzunlukları dengeli (ortalama 883 karakter), ancak kaynak alaka düzeyinde ciddi sorunlar var: TCK'nın asıl suç maddeleri retrieval'a gelmiyor, bunun yerine genel/usul maddeleri doluyor. Bu boşluk zaman zaman generator'ı yanlış veya yanıltıcı madde numaraları üretmeye itiyor. İki soruda (S5, S12) model kaynakların yetersiz olduğunu açıkça kabul edip cevabı sınırlamış — bu olumlu bir davranış. Üç soruda (S2, S3, S11) ise kaynaklarda olmayan hukuki detay üretilmiş; bunlar en kritik halüsinasyon vakaları.

---

## 1. Kategori Tespit Doğruluğu — 8.5 / 10

**Sonuç: Güçlü, tek ciddi hata S10.**

11 yanıt içinde 10'u doğru sınıflandırılmış. Yanlış tespit yalnızca **S10 — "Sabıka kaydı ne zaman silinir?"** sorusunda yaşanmış; model bunu "Genel Hukuk" olarak etiketlemiş. Bunun iki göstergesi var:

1. "Sabıka" ve "arşiv kaydı" kelimelerinin Ceza Hukuku kategorisiyle eşleştirilmediği görülüyor.
2. Retrieval'ın tamamen çökmesi (kaynak skoru: 0.0672, kaynaklar TBK, SGK ve TTK gibi alakasız kanunlardan oluşuyor) kategori sınıflandırıcısını da etkilemiş olabilir.

S8 (HAGB sorusu) HTTP 503 ile başarısız; kategori tespiti yapılamamış — bu sistem altyapısı meselesi, sınıflandırıcı başarısızlığı değil.

---

## 2. Cevap Kalitesi — 6 / 10

**Uzunluk sorunu yok.** En kısa cevap S10 (217 karakter — retrieval çökmesi sonucu), en uzun S2 (2000 karakter). "Çok kısa" veya "aşırı uzun" kategorisine giren cevap yok.

**Güçlü cevaplar:**

- **S6 — Taksirle yaralama (trafik kazası):** TCK m.89 ceza sınırını doğru vermiş (3 ay - 1 yıl), KTK m.85 sorumluluk hükmünü yerinde kullanmış, süreç mantıklı anlatılmış.
- **S7 — Uyuşturucu kullanım:** TCK m.191 ile 5 yıllık erteleme ve denetimli serbestlik tedbiri doğru ve kaynakla uyumlu.
- **S9 — Adli para cezası:** TCK m.52 referansıyla hapse çevirme mekanizması doğru anlatılmış.

**Zayıf cevaplar:**

- **S2 — Tehdit suçu:** Model TCK m.107'nin "teşhir suretiyle tehdit" suçunu düzenlediğini söylüyor — **yanlış**. TCK m.107 şantaj suçunu düzenliyor. Ayrıca "tehdit suçunun insan ticareti (m.80) olarak da işlenebileceği" iddiası kuruluyor — bu yanıltıcı ve hukuki açıdan yanlış bir bağlantı.
- **S3 — İnternet dolandırıcılığı:** Model TCK m.159'u (alacağı tahsil amacıyla dolandırıcılık) esas alarak "6 aydan 1 yıla kadar hapis veya adli para cezası" veriyor. Oysa internet dolandırıcılığı **TCK m.157-158 nitelikli dolandırıcılık** kapsamında olup ceza 2-7 yıl. Hem madde hem ceza sınırı hatalı.
- **S11 — Meşru savunma:** Soru "meşru savunmanın şartlarını" soruyor. Cevap TCK m.25 şartlarını anlatmak yerine m.27 sınır aşımı üzerine kurulmuş. Vatandaş meşru savunmanın ne zaman geçerli olduğunu öğrenemiyor, sınır aşımının ne zaman mazur görüleceğini öğreniyor — yanıltıcı bir kapsam kayması.
- **S5 — Kasten yaralama şikayet süresi (432 karakter):** Model kaynakların yetersiz olduğunu kabul edip cevabı sınırlamış. Doğru davranış; ancak kullanıcı boş kalıyor. Cevap: kasten yaralama şikayete tabi değil, re'sen kovuşturulur — bu bilgi kaynaksız da verilebilirdi.
- **S12 — Uzaklaştırma kararı ihlali:** Yine kaynak yetersizliği kabul edilmiş. 6284 sayılı Kanun m.13 veri tabanında yoksa model bunu doğru tespit etmiş; ama kullanıcı temel yönlendirmeden de yoksun kalıyor.

**Uyarı kullanımı:** 11 cevabın tamamında "Bu konu profesyonel hukuki destek gerektirmektedir; ALO 182" uyarısı var. S9 gibi teknik bilgi soruları için uyarı gereksiz; S3, S5, S12 için yerinde. Mekanik kullanım uyarıyı anlamsızlaştırıyor.

---

## 3. Kaynak Alaka Düzeyi — 4.5 / 10

**Kritik çelişki:** Ortalama kaynak skoru 0.8684 — bu iyi bir metrik gibi görünüyor. Ancak skor semantik alakayla değil, vektör benzerliğiyle ölçülüyor. İçeriksel alaka çok daha zayıf.

**İsabetli retrieval örnekleri:**

- **S7 — Uyuşturucu:** TCK m.188 ve m.191 birlikte gelmiş, doğru yasa maddeleri.
- **S9 — Adli para cezası:** TCK m.52, m.50, m.65 — doğrudan ilgili maddeler.
- **S6 — Trafik/taksirle yaralama:** KTK m.85 ve m.48 anlamlı kaynaklar; TCK m.89 gelmemiş ama cevap yine de doğru kurulmuş.

**Başarısız retrieval örnekleri:**

| Soru | Beklenen kaynak | Gelen kaynaklar |
|---|---|---|
| S1 — Hakaret şikayeti | TCK m.125-131 (hakaret), CMK m.73 (şikayet süresi) | Anayasa m.174, TCK m.75, m.50 — hiçbiri hakaret hükmü değil |
| S2 — Tehdit suçu | TCK m.106-107 (tehdit) | TCK m.51, m.84, m.11, m.12, m.80 — m.106 gelmiyor |
| S3 — İnternet dolandırıcılığı | TCK m.157-158 | TCK m.156, m.159, m.11, m.12, m.39 — m.157-158 gelmiyor |
| S10 — Sabıka kaydı | 5352 sayılı Adli Sicil Kanunu | TBK m.134, SGK m.41, FSEK m.53, TTK m.415 — tamamen alakasız |
| S11 — Meşru savunma | TCK m.25 (meşru savunma), m.26 (hakkın kullanılması) | 5651 m.12, TTK m.1533, TMK m.1001 — TCK m.25 gelmiyor |
| S12 — Uzaklaştırma ihlali | 6284 sayılı Kanun m.13 | Anayasa m.174, TCK m.51, m.191, m.221 — 6284 yok |

**Yapısal sorun:** TCK'nın suç tanımları (hakaret, tehdit, dolandırıcılık, meşru savunma) retrieval'a gelmiyor. Bunun yerine TCK'nın genel hükümler bölümü (m.11-12, m.38-39, m.50-53) defalarca dönüyor. Retrieval ceza hukuku sorusunu TCK'ya ulaştırabiliyor fakat doğru suç maddesine odaklanamıyor.

**S10 özel durumu:** Kaynak skoru 0.0672 — sistemin bu soruyu hiç karşılayamadığını gösteren net bir sinyal. 5352 sayılı Adli Sicil Kanunu veri tabanında bulunmuyor.

---

## 4. Halüsinasyon (Faithfulness) — 5 / 10

**Olumlu taraf:** S5, S10 ve S12'de model kaynak yetersizliğini fark edip "bu konu kaynaklarda yer almıyor" diyerek cevabı sınırlamış. Bu güvenli davranış.

**Doğrulanmış halüsinasyon vakaları:**

- **S2 — Tehdit suçu — TCK m.107 yanlış tanım:**  
  Model "m.107 teşhir suretiyle tehdit suçu" tanımı yapıyor. TCK m.107 şantaj suçunu düzenliyor; "teşhir suretiyle tehdit" böyle bir norm kategorisi değil. Kaynakta m.107 bulunmuyor — model kendiliğinden üretmiş.

- **S2 — İnsan ticareti bağlantısı:**  
  "Tehdit suçu ayrıca m.80 insan ticareti olarak da işlenebilir" cümlesi kurulmuş. Bu hukuki açıdan yanlış ve yanıltıcı; tehdit, insan ticaretinin bir öğesi olabilir ama onun alternatif biçimi değil.

- **S3 — İnternet dolandırıcılığı madde ve ceza hatası:**  
  TCK m.159 "alacağı tahsil amacıyla dolandırıcılık" özel hali. İnternet dolandırıcılığı için geçerli madde TCK m.157 (genel dolandırıcılık: 1-5 yıl) veya m.158/1-e (bilişim sistemleri aracılığıyla nitelikli dolandırıcılık: 2-7 yıl). Model m.159'u gösterince ceza aralığı da "6 ay - 1 yıl" gibi yanlış çıkıyor.

- **S11 — Meşru savunma — kapsam sapması:**  
  Soruya göre yanıt TCK m.25'in şartlarını (ağır ve haksız saldırı, zorunlu oran, savunma kastı) açıklamalıydı. Model bunun yerine TCK m.27 sınır aşımı üzerine cevap kurmuş. Kaynak da buna paralel: m.27 gelmiş, m.25 gelmemiş. Bu bir retrieval kusurunun generator'a yansımasıdır.

- **S1 — Hakaret başvuru mercii:**  
  "Sulh ceza hakimliğine veya Cumhuriyet başsavcılığına başvurabilirsiniz" denmiş. Hakaret şikayeti doğrudan sulh ceza hakimliğine yapılmaz; Cumhuriyet Başsavcılığı'na yapılır. Bilgi kısmen doğru ama sulh ceza eklentisi yanıltıcı.

**Uyarı koşulluluğu:** Tüm cevaplarda mekanik uyarı var. S9 (adli para cezası hapis çevirme — teknik bilgi) veya S11 (meşru savunma koşulları — genel hukuki bilgi) için ALO 182 uyarısı anlamsız. Buna karşın S3 (dolandırıcılık), S5 (kasten yaralama), S12 (uzaklaştırma ihlali) için uyarı yerinde.

---

## Özet Skor Tablosu

| Kategori | Kategori Tespit | Cevap Kalitesi | Kaynak Alaka | Halüsinasyon Yokluğu | GENEL |
|---|---|---|---|---|---|
| Ceza Hukuku | 8.5/10 | 6/10 | 4.5/10 | 5/10 | **6/10** |

> Not: S8 (HTTP 503) değerlendirme dışı tutulmuştur. Hesaplamalar 11 başarılı yanıt üzerinden yapılmıştır.

---

## İyileştirme Önerileri

### En kritik 3 sorun

**1. TCK suç maddeleri retrieval'a gelmiyor — genel/usul maddeler doluyor.**  
Hakaret sorusunda TCK m.125, tehdit sorusunda m.106, dolandırıcılık sorusunda m.157-158, meşru savunmada m.25 gelmiyor. Bunun yerine TCK'nın genel hükümler bölümü (m.11-12, m.38-39, m.50-53) tekrarlıyor. Bu yapısal bir indeks sorunudur. Çözüm: TCK suç tanımı maddelerini (m.77-345 arası) ayrı, suç türü etiketiyle chunk'lanmalı ve retrieval testleri suç adı → madde eşleşmesi ölçülmeli.

**2. Veri tabanında olmayan ama sık sorulan kanunlar var.**  
5352 sayılı Adli Sicil Kanunu (sabıka kaydı), 6284 sayılı Ailenin Korunması Kanunu (uzaklaştırma), CMK m.73 (şikayet süreleri) retrieval'a gelmiyor. Bu sorgular için kaynak skoru sıfıra yakın; bu durum hem yanlış kategori tespitine hem boş cevaplara yol açıyor. Çözüm: bu kanunlar öncelikli olarak vektör veri tabanına eklenmeli.

**3. Generator kaynaklarda olmayan madde numarası ve ceza sınırı üretiyor.**  
S2'de m.107 yanlış tanımı, S3'te yanlış madde ve yanlış ceza aralığı bunun somut örnekleri. Çözüm: generator prompt'una "getirilen kaynaklarda geçmeyen madde numarası, ceza sınırı veya suç tanımı üretme; eğer kaynak yetersizse S5 ve S12 gibi sınırı açıkla" kuralı eklenmeli.

### Retrieval iyileştirilmesi gereken alanlar

Öncelik sırası:

1. **TCK suç tanımı maddeleri (m.77-345):** hakaret (m.125-131), tehdit (m.106), dolandırıcılık (m.157-158), meşru savunma (m.25-26), uyuşturucu (m.188-192), kasten yaralama (m.86-89) — her biri suç türü etiketiyle ayrı chunk.
2. **5352 sayılı Adli Sicil Kanunu:** sabıka kaydı, silinme ve arşiv koşulları (m.9-12).
3. **6284 sayılı Ailenin Korunması Kanunu:** uzaklaştırma (m.5), ihlal yaptırımı (m.13).
4. **CMK şikayet ve dava zamanaşımı hükümleri (m.66-73):** şikayet süreleri, takipsizlik.

### Generator prompt'u düzeltilmesi gereken alanlar

- **"Kaynaklarda geçmeyen bilgi üretme" kısıtı:** Madde numarası, ceza sınırı ve suç tanımı yalnızca getirilen kaynaklarda varsa yazılsın.
- **Kısmi retrieval durumu:** Kaynak yetersiz ama konu tanınıyorsa (S5, S12 gibi) model şunu söylesin: "Bu sorunun tam yanıtı için [kanun adı] gerekiyor; kaynaklar bu konuyu karşılamıyor. ALO 182 veya baro hukuki yardım bürosu ile görüşmenizi öneririz." Boş bırakmak yerine yönlendirme yapsın.
- **Uyarı koşullulaştırılsın:** ALO 182 uyarısı yalnızca statü kaybı, cezai yaptırım, sınır dışı, gözaltı/tutukluluk, tazminat talebi veya somut hak kaybı riski içeren sorularda eklensin. S9 (teknik bilgi sorusu) veya S11 (kavram açıklaması) için mekanik uyarı anlamsız.

### Vektör veri tabanına eklenmesi gereken kaynaklar

- **5352 sayılı Adli Sicil Kanunu** — sabıka kaydı, silinme süreleri, arşive dönüşme koşulları
- **6284 sayılı Ailenin Korunması ve Şiddetin Önlenmesine Dair Kanun** — uzaklaştırma, tedbir kararları ve ihlal yaptırımları
- **TCK m.125-131** — hakaret suçu (sosyal medya ve alenen hakaret dahil)
- **TCK m.106-107** — tehdit ve şantaj suç tanımları
- **TCK m.157-158** — dolandırıcılık (genel ve bilişim yoluyla nitelikli hal)
- **TCK m.25-27** — meşru savunma, zorunluluk hali, sınır aşımı
- **CMK m.66-73** — şikayet süresi ve zamanaşımı
- **Adalet Bakanlığı / UYAP** üzerinden HAGB, erteleme, denetimli serbestlik uygulama rehberleri

Sonuç olarak Ceza Hukuku testinin en güçlü alanı kategori tespiti ve uyuşturucu/para cezası gibi kaynak eşleşmesi kolay suçlar. En zayıf alan TCK'nın suç tanımı maddelerine retrieval isabeti — bu sorun hem doğrudan hatalı yanıtlara hem generator'ın boşluğu halüsinasyonla doldurmasına yol açıyor. Retrieval katmanı düzeltilmeden yalnızca generator prompt'u düzenlemek yetersiz kalacak.
