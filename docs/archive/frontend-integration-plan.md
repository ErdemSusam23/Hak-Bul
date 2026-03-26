# Frontend Backend Entegrasyon Planı

> **Durum: TAMAMLANDI** — Aşağıdaki tüm görevler implement edilmiştir.

## Context
Backend tüm endpoint'leri hazır, frontend tüm backend entegrasyonu tamamlanmıştır. Bu doküman referans olarak saklanmaktadır.

---

## Görev Sırası (Tümü Tamamlandı)

### 1. ✅ `api/client.js` — Auth interceptor + yeni API fonksiyonları

**Sorun:** Token sessionStorage'da duruyor ama hiçbir isteğe eklenmıyor.

Eklenecekler:
- `axios` interceptor: her isteğe `Authorization: Bearer {token}` başlığı ekle
- 401 gelince `tokenYenile()` çağır, başarılıysa isteği tekrarla
- Yeni fonksiyonlar:
  ```js
  konusmalariGetir()           // GET /chat/conversations
  konusmaGetir(id)             // GET /chat/history/{id}
  misafirKonusmalariGetir(guestSessionId)   // GET /chat/guest/conversations
  misafirKonusmaGetir(id, guestSessionId)   // GET /chat/guest/history/{id}
  feedbackGonder(messageId, puan, guestSessionId)  // POST /feedback
  pdfAnalizEt(dosya, soru, conversationId, guestSessionId)  // POST /documents/analyze
  taslakListesi()              // GET /templates
  taslakPdfUret(templateId, alanlar)  // POST /templates/{id}/generate → Blob
  adminStats()                 // GET /admin/stats
  adminKategoriler()           // GET /admin/stats/categories
  adminFeedback()              // GET /admin/stats/feedback
  adminGunluk(gun)             // GET /admin/stats/daily
  ```

**Kritik:** interceptor'ın `AuthContext`'e erişimi yok → `accessToken()` getter'ı bir singleton/callback ile `client.js`'e enjekte edilmeli. Öneri: `client.js`'e `setAccessTokenGetter(fn)` ekle, `AuthContext.jsx`'te mount'ta çağır.

**Kritik dosyalar:**
- `frontend/src/api/client.js`
- `frontend/src/context/AuthContext.jsx`

---

### 2. ✅ `hooks/useChat.js` — Oturum & ID takibi

**Sorun:** `/ask` response'undaki `conversation_id`, `guest_session_id`, `message_id` capture edilmiyor.

Değişiklikler:
- `conversationIdRef` ve `guestSessionIdRef` useRef ile tut
- `mesajGonder` içinde ilk mesajda backend'den gelen `conversation_id`/`guest_session_id` kaydet; sonrakilere gönder
- Asistan mesajına `messageId` alanı ekle (feedback için)
- Yeni fonksiyon: `pdfGonder(dosya, soru)` — `pdfAnalizEt()` çağırır, mesajlar listesine ekler

**Kritik dosya:** `frontend/src/hooks/useChat.js`

---

### 3. ✅ `components/SohbetMesaji.jsx` + `FeedbackButonlari.jsx` — Feedback butonları

Asistan mesajının altına 👍/👎 butonları ekle:
- `mesaj.messageId` varsa butonları göster
- Tıklanınca `feedbackGonder(messageId, puan)` çağır
- Seçili puan vurgulanır, tekrar tıklanınca sıfırlanır
- `guestSessionId`'yi `useChat` hook'undan prop olarak al

**Kritik dosyalar:**
- `frontend/src/components/SohbetMesaji.jsx`
- `frontend/src/pages/SohbetSayfasi.jsx` (hook'tan guestSessionId al ve SohbetMesaji'ye geç)

---

### 4. ✅ `pages/SohbetSayfasi.jsx` — PDF yükleme butonu

Giriş çubuğuna Paperclip butonu ve hidden `<input type="file">` ekle:
- Dosya seçilince `pdfGonder(dosya, girdi)` çağır, `girdi` temizle
- `useChat`'ten `pdfGonder` al

**Kritik dosya:** `frontend/src/pages/SohbetSayfasi.jsx`

---

### 5. ✅ `App.jsx` — Sohbet geçmişi backend'den çek

**Sorun:** Sol panel `sohbetleriGetir()` ile localStorage okuyor, backend'e hiç gitmiyor.

Değişiklikler:
- Auth kullanıcıysa: `konusmalariGetir()` çağır → `title || "Sohbet (N mesaj)"` göster
- Misafirse: `misafirKonusmalariGetir(guestSessionId)` çağır
- Sohbete tıklanınca: `konusmaGetir(id)` veya `misafirKonusmaGetir(id, guestSessionId)` ile mesajları çek, `mesajlariYukle()` ile yükle
- `guestSessionId` global state'e taşı (şu an her yerde bağımsız)
- localStorage senkronizasyonu kaldırılabilir ya da fallback olarak kalabilir

**Kritik dosyalar:**
- `frontend/src/App.jsx`
- `frontend/src/hooks/useChat.js` (guestSessionIdRef'i dışarıya expose et)

---

### 6. ✅ `pages/TaslakSayfasi.jsx` — Hukuki Belge Taslakları

Yeni sayfa:
- `taslakListesi()` ile 4 taslağı listele
- Her taslak bir kart; tıklanınca modal/form açılır
- Form alanlarını `taslak.alanlar`'dan dinamik üret (zorunlu işaretle)
- "PDF İndir" butonu: `taslakPdfUret()` → `Blob` → `URL.createObjectURL` → `<a download>` click
- Navigasyon: App.jsx'te sidebar'a "Belge Taslakları" linki ekle

**Yeni dosya:** `frontend/src/pages/TaslakSayfasi.jsx`

---

### 7. ✅ `pages/AdminSayfasi.jsx` — Admin dashboard

Sadece `kullanici.role === 'admin'` ise sidebar'da görünür:
- 4 kart: toplam kullanıcı / mesaj / konuşma / feedback oranı
- Kategori dağılımı basit liste
- Günlük aktivite tablosu

**Yeni dosya:** `frontend/src/pages/AdminSayfasi.jsx`

---

## Dosya Değişiklik Özeti

| Dosya | Değişiklik |
|---|---|
| `api/client.js` | Auth interceptor + 10 yeni API fonksiyonu |
| `context/AuthContext.jsx` | `setAccessTokenGetter` çağrısı ekle |
| `hooks/useChat.js` | ID takibi, `pdfGonder`, guestSessionId expose |
| `components/SohbetMesaji.jsx` | Feedback butonları |
| `pages/SohbetSayfasi.jsx` | PDF upload butonu, guestSessionId prop |
| `App.jsx` | Backend'den geçmiş çekme, TaslakSayfasi linki |
| `pages/TaslakSayfasi.jsx` | **YENİ** — taslak listesi + PDF indirme |
| `pages/AdminSayfasi.jsx` | **YENİ** — admin istatistik sayfası |

---

## Doğrulama

1. Giriş yap → soru sor → konuşma geçmişe düşsün → sol panelde `title` görünsün
2. Misafir olarak soru sor → `guest_session_id` ile geçmiş görünsün
3. Asistan mesajının altında 👍/👎 butonları çalışsın
4. PDF yükle → analiz yanıtı chat'e eklensin
5. Taslak sayfasında form doldur → PDF insin
6. Admin hesabıyla giriş → admin sayfası görünsün, istatistikler yüklensin
