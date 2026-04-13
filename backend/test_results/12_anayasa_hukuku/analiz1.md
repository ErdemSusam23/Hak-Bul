Aşağıda detaylı değerlendirmem yer alıyor. Önce özet görseli, ardından detaylı analiz.---

## 1. Kategori Tespit Doğruluğu — 0 / 10

**Sonuç: Tam başarısızlık.** 12 sorunun tamamı yanlış sınıflandırılmış. `kategori_dogruluk_orani: 0.0` sistem raporunda da bu gerçeği teyit ediyor.

Tespit edilen kategoriler: Genel Hukuk (5), İş Hukuku (2), Ceza Hukuku (2), Kira Hukuku (1), Ticaret Hukuku (1). "Anayasa Hukuku" hiçbir soruda tespit edilememiş.

**Ortak patern:** Model kategori sınıflandırmasını ya anlam benzerliği üzerinden değil soru yüzeyindeki kelime tetikleyicileri üzerinden yapıyor ya da sınıf etiketleri arasında "Anayasa Hukuku" kategorisi hiç tanımlı değil. Şüpheli durumlar:

- "Toplantı ve gösteri yürüyüşü" → İş Hukuku (muhtemelen "toplantı" kelimesi)
- "Basın özgürlüğü" → İş Hukuku
- "Vatandaşlıktan çıkarma" → Ticaret Hukuku
- "Konut dokunulmazlığı" → Kira Hukuku (muhtemelen "konut" kelimesi)
- "Seçme ve seçilme hakkı" → Ceza Hukuku (muhtemelen "suç" kelimesi)

Bu yanlış sınıflandırma retrieval pipeline'ını kökten bozuyor: model yanlış vektör indeksini ya da filtre kümesini sorguluyor.

---

## 2. Cevap Kalitesi — 5.5 / 10

Teknik olarak cevaplar çökmüyor (12/12 başarılı) ve uzunluk makul (859–1994 karakter). Ancak içerik kalitesi sorunlu:

**İyi yönler:** Sorular genel olarak yanıtlanıyor. Soru 5 (konut dokunulmazlığı), 7 (dernek kurma), 9 (din özgürlüğü), 10 (olağanüstü hal), 12 (seçme-seçilme) doğrudan ve bilgilendirici cevaplar içeriyor.

**Zayıf yönler:**
- **Soru 2** — "Anayasa'nın 12. maddesine göre... eşitlik ve adalet ilkelerine uygun olarak yararlanırlar" ifadesi hatalı. Anayasa m.10 eşitlik ilkesidir, m.12 "temel hak ve hürriyetlerin niteliği"dir. Madde numarası karışıklığı var.
- **Soru 8** — Model "verilen kaynaklar yeterli bilgi sağlamamaktadır" diyerek dürüstçe itiraf ediyor ama bu yeterli değil; basın özgürlüğü ve kaynak gizliliğini kendi bilgisinden kısaca açıklamakla yetiniyor.
- **Soru 11** — Cevap içinde beklenmedik Çince karakter ("详细") var. Bu ciddi bir teknik hata ve güven kaybına yol açar.
- Tüm sorularda mekanik "Bu konu profesyonel hukuki destek gerektirmektedir" uyarısı var. Soru 10 gibi genel bilgi sorularında bu uyarı orantısız.

---

## 3. Kaynak Alaka Düzeyi (Context Precision) — 3.5 / 10

**Kritik sorun:** Vektör benzerlik skorları (0.82–0.88) yanıltıcı biçimde yüksek görünüyor ancak içeriksel alaka çok farklı.

**Tamamen alakasız kaynaklar getirilen sorgular:**

| Soru | Beklenen | Getirilen |
|---|---|---|
| S1 – AYM bireysel başvuru | 6216 sayılı Kanun maddeleri | 9. HD iş hukuku kararları (temyiz süresi) |
| S2 – Temel haklar güvencesi | Anayasa ilgili maddeleri | 5510 SSK Kanunu m.106, Geçici m.66 |
| S6 – Toplantı ve gösteri | 2911 sayılı Kanun | 9. HD arabuluculuk kararları |
| S8 – Basın özgürlüğü | Anayasa m.28, 5187 sayılı Basın Kanunu | 4. HD'nin sadece karar sonuç paragrafları ("dosyanın mahkemeye gönderilmesine karar verildi") |
| S11 – Vatandaşlıktan çıkarma | 5901 sayılı Kanun | TMK m.512 mirasçılıktan çıkarma |

**Kısmi alaka gösteren sorgular:** S3, S4, S5, S9, S12 — bu sorgularda bir ya da iki ilgili Anayasa maddesi gelmiş, ancak geri kalan kaynaklar doldurma niteliğinde.

**En iyi retrieval:** S7 (dernek kurma) ve S10 (olağanüstü hal) — Anayasa maddeleri ve TMK'nın ilgili bölümleri doğru getirilmiş.

**Sistemik sorun:** Retrieval muhtemelen kategori etiketiyle filtreleme yapıyor. "İş Hukuku" etiketiyle sorgulanan bir sorgu İş Hukuku Yargıtay kararlarını çekiyor. Anayasa Hukuku belgelerini kapsayan ayrı bir koleksiyon ya mevcut değil ya da yönlendirme mekanizması çalışmıyor.

---

## 4. Halüsinasyon (Faithfulness) — 4.5 / 10

Kaynakların büyük çoğunluğu soruyla alakasız olduğundan model kendi ön bilgisine dayanarak yanıt üretiyor. Bu faithfulness değerlendirmesini zorlaştırıyor ama aynı zamanda büyük bir risk faktörü.

**Doğrulanan sorunlar:**

- **Soru 2 — Yanlış madde numarası:** Eşitlik ilkesi için Anayasa m.12 atıfta bulunuluyor, doğrusu m.10. Kaynaklarda bu madde yok; model kendi bilgisinden hatalı üretiyor.
- **Soru 8 — Belirsiz atıf:** "Basın araçlarının devlet eliyle veya tekelleştirilerek topluma haber ve düşüncelerin aktarılmasına engel olunamaz" şeklindeki tanımlama Anayasa m.28'in tam metni değil.
- **Soru 11 — Çince karakter:** "daha详细 bilgi" ifadesi çıktıya karışmış. Bu muhtemelen model bağlamından kaynaklanan bir ön-bellek sızıntısı; ciddi güvenilirlik sorunu.
- **Soru 1 — Kaynaktan bağımsız cevap:** Tüm kaynaklar İş Hukuku kararları olmasına rağmen model bireysel başvuru prosedürünü doğruca anlatıyor. İçerik şans eseri doğru görünüyor ama faithfulness değil — LLM kendi bilgisinden üretti.

**Olumlu:** "Bu konu profesyonel hukuki destek gerektirmektedir" uyarısı tutarlı şekilde tüm cevaplarda mevcut. Soru 11'de "verilen kaynaklar arasında bu kanuna ilişkin bir madde bulunmamaktadır" diyerek kaynak yokluğunu şeffaf biçimde beyan etmiş.

---

## Özet Skor Tablosu

| Soru | Kategori Tespit | Cevap Kalitesi | Kaynak Alaka | Halüsinasyon Yokluğu | Genel |
|---|---|---|---|---|---|
| S1 – AYM bireysel başvuru | 0/10 | 6/10 | 2/10 | 6/10 | 3.5/10 |
| S2 – Temel haklar | 0/10 | 5/10 | 1/10 | 4/10 | 2.5/10 |
| S3 – İfade özgürlüğü | 0/10 | 6/10 | 5/10 | 6/10 | 4/10 |
| S4 – Kişi dokunulmazlığı | 0/10 | 5/10 | 4/10 | 6/10 | 3.5/10 |
| S5 – Konut dokunulmazlığı | 0/10 | 7/10 | 4/10 | 7/10 | 4.5/10 |
| S6 – Toplantı hakkı | 0/10 | 5/10 | 1/10 | 5/10 | 2.5/10 |
| S7 – Dernek kurma | 0/10 | 7/10 | 8/10 | 7/10 | 5.5/10 |
| S8 – Basın özgürlüğü | 0/10 | 4/10 | 1/10 | 4/10 | 2/10 |
| S9 – Din özgürlüğü | 0/10 | 7/10 | 5/10 | 6/10 | 4.5/10 |
| S10 – Olağanüstü hal | 0/10 | 7/10 | 8/10 | 7/10 | 5.5/10 |
| S11 – Vatandaşlıktan çıkarma | 0/10 | 4/10 | 2/10 | 3/10 | 2.5/10 |
| S12 – Seçme-seçilme hakkı | 0/10 | 7/10 | 6/10 | 6/10 | 4.5/10 |
| **ORTALAMA** | **0/10** | **5.8/10** | **3.9/10** | **5.6/10** | **3.8/10** |

---

## İyileştirme Önerileri

### En kritik 3 sorun

**1. Kategori sınıflandırıcısı çalışmıyor.** "Anayasa Hukuku" sınıfı ya modelin etiket kümesinde tanımlı değil ya da sınıflandırıcı hiç bu etiketi üretemiyor. Bu tek sorun tüm diğer sorunları zincirleme tetikliyor. Çözüm: Sınıflandırıcıyı Anayasa Hukuku sorularını içeren etiketli örneklerle yeniden eğitmek veya zero-shot sınıflandırıcı yerine LLM tabanlı yönlendirme kullanmak.

**2. Retrieval vektör uzayı Anayasa dokümanlarını barındırmıyor ya da erişilemiyor.** 12 sorudan 8'inde Anayasa metni ya hiç gelmedi ya da rastlantısal (madde numarası eşleşmesiyle) geldi. Soru 9'da m.24 üç farklı kanundan geldi (İŞKUR m.24, 6284 m.24) — retrieval'ın anlam temelli değil lexical olduğunu gösteriyor. Çözüm: Anayasa metnini bölüm/madde bazında chunklayarak özel bir Anayasa koleksiyonu oluşturmak; chunk metadata'sına hak kategorisi etiketleri eklemek.

**3. Model faithfulness denetimi yok.** Kaynaklar alakasız geldiğinde LLM kendi bilgisinden yanıt üretiyor ve bu denetlenmiyor. Soru 2'deki yanlış madde numarası ve Soru 11'deki Çince karakter bunun somut sonuçları. Çözüm: Cevap üretim prompt'una "yalnızca getirilen kaynaklara dayanarak yanıtla, kaynak yoksa bunu açıkça belirt" talimatı eklemek; çıktıda grounding skoru hesaplamak.

### Retrieval iyileştirilmesi gereken kategoriler

Öncelik sırası en acil'den itibaren:

- **Anayasa Hukuku** — Vektör tabanına 2709 sayılı Anayasa'nın tüm maddeleri + AYM içtihadı (bireysel başvuru kararları) + AİHM'in Türkiye aleyhine emsal kararları eklenmeli.
- **Kamu Hukuku genel** — Olağanüstü hal, vatandaşlık, seçim mevzuatı için 5901, 2972, 298 sayılı kanunlar.
- **Temel haklar jurisprudence'ı** — AYM bireysel başvuru kararlarının tam metni (özet değil) retrieval'a dahil edilmeli.

### Generator prompt'u düzeltilmesi gereken kategoriler

- **Anayasa Hukuku sorularında** prompt'a madde numarasını doğrulamaya yönlendiren bir talimat eklenmeli: "Anayasa maddesine atıf yaparken madde başlığını da yaz."
- **Kaynak yoksa susma talimatı** — mevcut prompta kaynaklar alakasız bile olsa yanıt üretme zorunluluğu varmış gibi görünüyor; "getirilen kaynaklar bu soruyu yanıtlamaya yetmiyorsa, yalnızca bu durumu açıkla ve kullanıcıyı yönlendir" modu eklenmeli.
- **Uyarı mantığı** — "Bu konu profesyonel hukuki destek gerektirmektedir" uyarısını her soruda değil, kişiye özel hukuki tavsiye istendiğinde verecek şekilde koşullu hale getirmek. Genel anayasal bilgi soruları bunu gerektirmiyor.

### Vektör tabanına eklenmesi gereken hukuk alanları

Mevcut veri setinin ağırlıklı olarak Yargıtay iş ve özel hukuk kararlarından oluştuğu görülüyor. Acil eklenecekler:

- Anayasa Mahkemesi bireysel başvuru kararları (2012–2025)
- 2911 sayılı Toplantı ve Gösteri Yürüyüşleri Kanunu
- 5187 sayılı Basın Kanunu
- 5901 sayılı Türk Vatandaşlığı Kanunu
- 2709 sayılı Anayasa — madde bazında chunked, her chunk'a hak kategorisi metadata'sı
- Danıştay İdare Hukuku kararları (vatandaşlık, olağanüstü hal, kamu görevlileri)
- AİHM'in Türkiye aleyhine temel hak ihlali kararları (özet formatında)