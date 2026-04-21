# Hak-Bul — Mevcut Özellikler

Son güncelleme: 2026-03-26

---

## Backend

### RAG Pipeline
- Qdrant vektör veritabanı entegrasyonu (lokal JSON fallback ile)
- Groq LLM ile yanıt üretimi
- Kaynak skor bazlı zayıf sorgu tespiti ve loglama (`weak_queries` tablosu)
- Kategori tespiti ve etiketleme

### Kimlik Doğrulama
- JWT access token + httpOnly cookie tabanlı refresh token
- Kayıt, giriş, çıkış, token yenileme endpoint'leri
- Kayıt için rate limit (5/dk)
- Profil görüntüleme ve güncelleme
- Hesap silme

### Sohbet Geçmişi
- Kayıtlı kullanıcılar için tam sohbet geçmişi (conversation + messages)
- Misafir kullanıcılar için session bazlı geçmiş
- Sohbet yeniden adlandırma
- Sohbet silme
- Sohbet PDF olarak dışa aktarma (ReportLab, Türkçe font desteği)
- Sohbet paylaşma (URL-safe token, hash-based routing `#/shared/TOKEN`)
- Paylaşımı kaldırma

### Döküman İşleme
- PDF yükleme ve analiz (`/documents/analyze`)
- İki PDF karşılaştırma (`/documents/compare`, 5/dk rate limit)

### Belge Taslakları
- Taslak listeleme (`/templates`)
- Taslak alanlarından PDF üretme (`/templates/{id}/generate`)
- Template input sanitizasyonu (XSS koruması — HTML escape, 500 karakter sınırı)

### Admin Paneli
- Genel istatistikler (kullanıcı, mesaj, konuşma, feedback sayıları)
- Kategori dağılımı grafiği
- Feedback özeti
- Günlük aktivite grafiği
- Kullanıcı listesi, rol güncelleme, durum (aktif/pasif) değiştirme
- Zayıf sorgu listesi (düşük güven skorlu sorgular)

### Güvenlik & Altyapı
- SlowAPI ile rate limiting
- CORS (`allow_credentials=True`, explicit origin listesi)
- Alembic migration sistemi (6 migration)
- Docker Compose ile servis yönetimi

### Avukat Yönlendirmesi
- Ceza davası, boşanma, icra, mülteci gibi kritik konularda yanıt sonuna otomatik avukat yönlendirme paragrafı ekleme
- Adalet Bakanlığı ALO 182 hattına yönlendirme

---

## Frontend

### Genel Arayüz
- Koyu tema (Catppuccin Mocha paleti) + tema CSS değişkenleri
- Responsive kenar çubuğu (daraltılabilir)
- ReactMarkdown ile yanıt render

### Sohbet
- Soru sorma ve yanıt görüntüleme
- SSE streaming desteği
- PDF yükleme ve analiz
- Kaynak listesi görüntüleme
- Feedback (beğen/beğenme)
- 429 / 503 hata mesajları

### Sohbet Geçmişi
- Kenar çubuğunda sohbet listesi
- Sohbet seçme ve yükleme
- Yeniden adlandırma (inline düzenleme)
- Silme (onay dialogu)
- PDF olarak indirme
- Paylaşım linki kopyalama
- Misafir geçmişi desteği

### Paylaşım
- Hash-based routing (`#/shared/TOKEN`) ile public sohbet görüntüleme sayfası
- `PaylasimSayfasi` — sadece okuma amaçlı, kayıt gerektirmez

### Belge Taslakları
- Taslak listeleme ve alan doldurma
- PDF üretme ve indirme

### Belge Karşılaştırma
- İki PDF yükleme (drag-and-drop)
- Özel karşılaştırma sorusu girişi
- Yan yana özet ve AI analizi görüntüleme (`KarsilastirmaSayfasi`)

### Kimlik Doğrulama
- Giriş, kayıt, çıkış
- httpOnly cookie ile otomatik token yenileme
- Profil sayfası (email güncelleme, şifre değiştirme, hesap silme)

### Admin Paneli
- Genel istatistik kartları
- Kategori pasta grafiği
- Günlük aktivite çizgi grafiği
- Kullanıcı yönetimi tablosu
- Zayıf sorgular sekmesi

### i18n (Çok Dil Desteği)
- `DilContext` + `tr.js` / `en.js` ile Türkçe/İngilizce UI
- Dil tercihi `localStorage`'da saklanır
- Kenar çubuğunda TR/EN toggle butonu

### Asistan Bot
- Sağ alt köşede floating chat widget (`AsistanBot`)
- Bağımsız mini sohbet arayüzü
- 429 / 503 hata yakalama
- Slide-up animasyonu, tam tema uyumlu

---

## Veritabanı Modelleri

| Tablo | Açıklama |
|-------|----------|
| `users` | Kullanıcı hesapları (email, şifre hash, rol, aktiflik) |
| `conversations` | Sohbet oturumları (kullanıcı veya misafir) |
| `chat_history` | Mesajlar (soru, yanıt, kaynaklar, kategori, başlık) |
| `feedback` | Kullanıcı feedback kayıtları |
| `weak_queries` | Düşük güven skorlu sorgular |
| `shared_conversations` | Paylaşılan sohbet token kayıtları |
