# Manuel Frontend Test Checklist

## Hata raporlama
Bir hata bulursan kısa ve net yaz. Uzun açıklama gerekmez. Amaç, ekran görüntüsüne bakmadan hatanın ne olduğunu anlayabilmek.

```text
/admin sayfasında alt istatistik kartlarında gerçek veri yerine sabit/mock veriler görünüyor. Admin hesabıyla giriş yaptıktan sonra /admin sayfasına gidince kartlardaki sayıların değişmediği görülüyor. Beklenen davranış, tüm kartların backend’den gelen gerçek verileri göstermesi.
```

Bir örnek daha:

```text
Profil sayfasında şifre değiştirildikten sonra kullanıcı oturumdan düşmüyor. Şifre başarıyla güncellendikten sonra uygulama yeniden giriş istemeden kullanılmaya devam ediyor. Beklenen davranış, şifre değişiminden sonra mevcut oturumun kapatılması ve kullanıcının yeniden giriş yapmasının istenmesi.
```

Not:
- Uygulamada mock data olmaması bekleniyor.
- Görsel, metin, liste, sayı, kart, toast veya boş durum içinde mock/fake/demo içerik görürsen hata olarak raporla.

## Genel checklist
- [ ] Ana sayfa, sohbet, forum, profil, admin ve paylaşım yüzeyleri açılıyor; boş/beyaz ekran yok.
- [ ] Konsolda kritik frontend hata davranışı oluşturan kırık akış yok.
- [ ] Ekranlarda `mock`, `demo`, `fake`, placeholder alert veya sabit test verisi görünmüyor.
- [ ] Metinlerde bozuk encoding yok (`Ã`, `Å`, anlamsız karakterler vb.).
- [ ] Toast, buton ve form aksiyonları çalışıyor; sahte başarı hissi veren kırık akış yok.

## Auth ve token checklist
- [ ] Geçerli kullanıcı ile giriş başarılı.
- [ ] Hatalı şifre ile girişte kullanıcı içeri alınmıyor; anlamlı hata gösteriliyor.
- [ ] Sayfa yenilenince oturum korunuyor; kullanıcı bir anda misafire düşmüyor.
- [ ] Oturum süresi dolmuş/bozulmuş durumda uygulama kendini toparlıyor; yanlış auth state göstermiyor.
- [ ] Çıkış yapınca kullanıcı landing/misafir akışına dönüyor.
- [ ] Logout sonrası korumalı alanlara eski oturumla erişilemiyor.
- [ ] Logout sonrası sayfa yenilenince kullanıcı tekrar giriş yapmış görünmüyor.
- [ ] E-posta değiştirince kullanıcı yeniden girişe yönlendiriliyor.
- [ ] Şifre değiştirince kullanıcı yeniden girişe yönlendiriliyor.
- [ ] Admin hesabı admin görünüyor; normal kullanıcı admin görünmüyor.

## Sayfa bazlı hızlı kontrol
- [ ] Sohbet: mesaj gönderme, PDF yükleme, yeni sohbet, geçmiş seçme, paylaşım, PDF export çalışıyor.
- [ ] Profil: profil bilgisi geliyor; e-posta ve şifre güncelleme akışı düzgün.
- [ ] Forum: liste, konu detay, yanıt/veri yükleme gerçek veri hissi veriyor; mock içerik yok.
- [ ] Admin: kullanıcılar, istatistikler ve zayıf sorgular gerçek veriyle geliyor; sabit kart/veri yok.

## Mock data özel kontrolü
- [ ] Her sayfada sabit örnek kullanıcı, sabit örnek sayı, örnek forum başlığı, örnek dashboard kartı kalmadı.
- [ ] Eğer herhangi bir yerde mock data tespit edilirse ayrı bug olarak raporlandı.
