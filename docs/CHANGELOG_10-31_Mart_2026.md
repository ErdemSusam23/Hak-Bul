# Hak-Bul Degisiklik Gunlugu

**Donem:** 10 Mart 2026 - 31 Mart 2026
**Toplam Commit:** 63

---

## Yeni Ozellikler

### RAG Pipeline ve Qdrant 

- **Embedding modeli yukseltmesi:** `intfloat/multilingual-e5-base` (768 boyut) modeline gecis yapildi. Turkce hukuki metinlerde daha iyi semantik arama performansi saglandi. (`6566ae6`)
- **Qdrant re-indexing scripti:** `load_qdrant.py` scripti eklendi; yerel JSON korpusunu yeni embedding modeliyle Qdrant'a yukler. (`80b65a2`)
- **Tum chunk'lar Qdrant'a tasinidi:** Hibrit yerel/Qdrant yaklasimi kaldirildi, tum kanun ve Yargitay kararlari tek Qdrant koleksiyonunda birlesti. (`e6570d4`)
- **Soru kategorilendirme:** RAG pipeline'a anahtar kelime tabanli kategorilendirici eklendi (Is Hukuku, Ceza Hukuku, Aile Hukuku vb. 8 kategori). Alembic migration ile `category` kolonu chat_history tablosuna eklendi. (`f0ea6fd`)
- **Mevzuat.gov.tr kanun scraper:** 33 kanundan 6.726 chunk olusturan web scraper yazildi. (`749607a`)

### Kimlik Dogrulama ve Guvenlik 

- **Yanit geri bildirimi (feedback):** Kullanici mesajlara begenme (+1) veya begenmeme (-1) verebilir. `message_feedback` tablosu ve `/feedback` endpoint'i eklendi. (`ae8e023`)
- **Misafir oturum guvenlik sertlestirmesi:** Misafir session ID dogrulama mekanizmasi eklendi, sohbet ve geri bildirim endpoint'lerinde sahiplik kontrolleri guclendirildi. (`0e1403d`)
- **Auth ve chat guvenlik iyilestirmeleri:** Refresh token rotasyonu duzeltildi, `deleted_at` kolonu ile soft-delete destegi eklendi. (`bf91fb8`)

### Belge Analizi 

- **PDF yukleme ve hukuki analiz:** `/documents/analyze` endpoint'i eklendi. PDF dosyasi yuklenir, metin cikarilir ve Groq LLM ile hukuki analiz yapilir. Kaynaklarla desteklenir. (`2d559aa`)
- **Belge karsilastirma:** Iki PDF'i karsilastirarak fark analizi yapan `/documents/compare` endpoint'i eklendi. (`f96f266`)
- **Belge test dosyasi:** `test_document_endpoint.py` ve `test_document_service.py` testleri eklendi. (`4b552a0`)

### Sablon Uretimi 

- **Hukuki belge sablonlari:** `GET /templates` ve `POST /templates/{id}/generate` endpoint'leri eklendi. Kira sozlesmesi, is sozlesmesi, ihtarname ve taahhutname sablonlari PDF olarak uretilir. (`215fcdf`)
- **Turkce font destegi ve PDF indirme duzeltmesi:** Template PDF'lerde Turkce karakter destegi eklendi, frontend hot reload yapilandirildi. (`2e71797`)

### Admin Paneli 

- **Admin analitik dashboard:** `GET /admin/stats/*` endpoint'leri eklendi: genel istatistikler, kategori dagilimi, geri bildirim ozeti, gunluk aktivite. (`b909cf8`)
- **Admin frontend paneli:** React tarafinda AdminSayfasi komponenti eklendi; misafir gecmisi gorunumu, kategori etiketi, UTC tarih duzeltmesi, 429 hata mesaji. (`2ff1fc4`)
- **Admin panel rol gorunurlugu:** Admin panelinde rol goruntuleme ve istatistik alan ismi uyumsuzluklari duzeltildi. (`d658bfa`)
- **Admin kullanici filtreleri:** Kullanici arama, sayfalama ve avukat rolu atama ozellikleri eklendi. (`b5d2988`)

### Sohbet Gecmisi 

- **Baslik kolonu:** `chat_history` tablosuna `title` kolonu eklendi; konusma listesi gorunumunde baslik gosterilir. (`5475233`)
- **Kaynaklar chat history'de saklanir:** Asistan yanitindaki `kaynaklar` bilgisi `metadata_json` alaninda JSON olarak kaydedilir. (`6bf81bf`)
- **Konusma silme (soft-delete):** `deleted_at` kolonu ile konusmalar kalici olarak silinmez, isaretlenir. (`bf91fb8`)
- **Konusma paylasimi:** Paylasim tokeni ile konusmalarin harici linkle paylasimi; `shared_conversations` tablosu ve endpoint'leri. (`62deadf`)
- **Konusma PDF export:** `/chat/conversations/{id}/export` ile konusma PDF olarak indirilir; Turkce metin ve guvenilir indirme akisi. (`77e1799`)
- **Misafir konusma silme:** Misafir kullanicilar kendi konusmalarini silebilir. (`72d9d79`)

### Forum Sistemi 

- **Avukat rolu (LAWYER):** `UserRole` enum'una `LAWYER` degeri eklendi; Alembic migration ile DB'ye yansitildi. (`c633286`, `d3b0842`)
- **Forum ORM modelleri:** `ForumThread`, `ForumReply`, `ForumVote` modelleri eklendi. (`141a0c1`)
- **Forum DB migration:** `forum_threads`, `forum_replies`, `forum_votes` tablolari olusturuldu. (`32afa27`)
- **Forum Pydantic semalari:** Thread/reply/vote icin istek ve yanit semalari. (`a1b80e9`)
- **Forum servis katmani:** Thread CRUD, yanit ekleme, oylama is mantigi. (`9ccbad0`)
- **Forum router:** Thread, yanit ve oylama endpoint'leri. (`823d23b`)
- **Forum API istemci fonksiyonlari:** Frontend'den forum API'sine erisim. (`c958935`)
- **ForumSayfasi:** Baslik listesi, kategori filtresi. (`cf3b969`)
- **ForumBaslikSayfasi:** Baslik detayi, yanitlar ve oylar. (`09d6b6f`)
- **Forum App.jsx entegrasyonu:** Routing, sidebar ve state yonetimi. (`d60d31e`)
- **Forum testleri:** Kapsamli forum endpoint testleri. (`af5ff85`)

### Coklu Dil Destegi 
- **Dil servisi:** `language_service.py` eklendi; Turkce/Ingilizce dil normalizasyonu ve UI metin secimi. (`f96f266`)
- **i18n dosyalari:** `i18n/tr.js` ve `i18n/en.js` ceviri dosyalari eklendi. (`62deadf`)
- **DilContext:** React context ile dil degistirme mekanizmasi. (`62deadf`)
- **Dil testi:** `test_language_support.py` eklendi. (`f96f266`)

### Frontend Bilesenler 

- **AsistanBot:** Canli destek/yardimci bot komponenti. (`62deadf`)
- **FeedbackButonlari:** Begeni/begenmeme butonlari komponenti. (`2ff1fc4`)
- **KarsilastirmaSayfasi:** Iki belgeyi karsilastirma sayfasi. (`62deadf`)
- **PaylasimSayfasi:** Paylasilan konusma goruntusu. (`62deadf`)
- **ProfilSayfasi:** Kullanici profil sayfasi. (`62deadf`)
- **TaslakSayfasi:** Hukuki belge taslagi olusturma sayfasi. (`2ff1fc4`)
- **DirekArama:** Dogrudan hukuk arama komponenti. (`00062b0`)
- **HukukiUyariModal:** Hukuki sorumluluk uyarisi modali. (`00062b0`)
- **Destek soru bankasi:** `destekSoruBankasi.js` ile sik sorulan sorular verisi. (`2ad1792`)

---

## Duzeltmeler (Bug Fix)

### Backend

| Tarih | Commit | Aciklama |
|-------|--------|----------|
| 16 Mart | `2cf9cf3` | Dockerfile ve env orneklerinde embedding model referanslari guncellendi |
| 23 Mart | `d658bfa` | Admin panelinde rol gorunurlugu ve istatistik alan ismi uyumsuzluklari |
| 23 Mart | `2e71797` | Template PDF'lerde Turkce font destegi |
| 26 Mart | `bf91fb8` | Auth token rotasyon hatasi ve chat soft-delete |
| 26 Mart | `ef9dc29` | Test rate-limit, cookie akisi ve sahte pipeline hatalari cozuldu |
| 26 Mart | `2e02493` | Chat history ve belge akisi test plani sorunlari |
| 26 Mart | `f96f266` | Coklu dil akislari ve belge analizi duzeltmeleri |
| 27 Mart | `0e1403d` | Misafir kimlik dogrulama ve sahiplik kontrolleri sertlestirildi |
| 27 Mart | `77e1799` | PDF export'ta Turkce metin ve guvenilir indirme akisi |
| 30 Mart | `57059de` | RAG categorizer, query rewriter ve retriever iyilestirmeleri |

### Frontend

| Tarih | Commit | Aciklama |
|-------|--------|----------|
| 27 Mart | `c36eb41` | Secili konusma silindiginde aktif sohbetin temizlenmesi |
| 27 Mart | `72d9d79` | Cikis/silme islemlerinde sohbet durumunun senkronizasyonu |
| 27 Mart | `dbd3527` | ProfilSayfasi guncelleme |
| 30 Mart | `00062b0` | Frontend genel duzeltme (UI bilesenler, CSS, i18n) |
| 30 Mart | `8880c3d` | Frontend2 duzeltme (tailwind, index.css, sayfa duzenlemeleri) |
| 30 Mart | `bb471ee` | Konusma silme butonu (Delete) eklendi |
| 30 Mart | `2ad1792` | AsistanBot (Chat Bot) duzeltildi |

---

## Testler

| Tarih | Commit | Dosya | Aciklama |
|-------|--------|-------|----------|
| 17 Mart | `4b552a0` | `test_document_endpoint.py` | Belge endpoint testleri |
| 17 Mart | `ae8e023` | `test_feedback.py` | Geri bildirim testleri |
| 17 Mart | `215fcdf` | `test_templates.py` | Sablon testleri |
| 17 Mart | `b909cf8` | `test_admin.py` | Admin testleri |
| 26 Mart | `ef9dc29` | `conftest.py` | Rate limit sifirlama fixture'i |
| 26 Mart | `62deadf` | `test_retrieval_regressions.py` | Qdrant ve yerel korpus entegrasyon testleri |
| 26 Mart | `f96f266` | `test_language_support.py` | Coklu dil testleri |
| 30 Mart | `af5ff85` | `test_forum.py` | Forum endpoint testleri |

---

## Dokumantasyon

| Tarih | Commit | Aciklama |
|-------|--------|----------|
| 16 Mart | `136018f` | Bitirme projesi ozellikler dokumani |
| 16 Mart | `948cd2a` | Veri akisi ve Qdrant mimarisi PDF'i |
| 17 Mart | `b942674` | Frontend entegrasyon dokumani |
| 23 Mart | `2e71797` | Frontend dev-Dockerfile eklendi |
| 26 Mart | `6ce6185` | Docs klasoru yeniden yapilandirildi (reference/, guides/, archive/) |
| 26 Mart | `ec23e4a` | API, veritabani ve RAG pipeline referans dokumanlari guncellendi |
| 27 Mart | `28144a2` | Gorev listesi olusturuldu |
| 30 Mart | `96b6b51` | Forum tasarim spesifikasyonu |
| 30 Mart | `a4dee7d` | Forum uygulama plani |
| 30 Mart | `14396e3` | Frontend tema ve tipografi dokumani |

---

## Veritabani Migrationlari

| Sira | Tarih | Dosya | Aciklama |
|------|-------|-------|----------|
| 0003 | 16 Mart | `20260316_0003` | `chat_history` tablosuna `category` kolonu |
| 0004 | 17 Mart | `20260317_0004` | `message_feedback` tablosu |
| 0005 | 17 Mart | `20260317_0005` | `chat_history` tablosuna `title` kolonu |
| 0006 | 26 Mart | `20260326_0006` | `weak_queries` ve `shared_conversations` tablolari |
| 0007 | 26 Mart | `20260326_0007` | `chat_history` tablosuna `deleted_at` kolonu (soft-delete) |
| 0008 | 30 Mart | `20260330_0008` | `userrole` enum'una `lawyer` degeri |
| 0009 | 30 Mart | `20260330_0009` | `forum_threads`, `forum_replies`, `forum_votes` tablolari |

---

## Ozet Istatistikler

| Metrik | Deger |
|--------|-------|
| Toplam commit | 63 |
| Yeni ozellik (feat) | 28 |
| Duzeltme (fix) | 17 |
| Dokumantasyon (docs) | 11 |
| Test | 8 |
| Yeni backend dosyasi | ~30 |
| Yeni frontend dosyasi | ~15 |
| Yeni DB migration | 7 |
| Yeni tablo | 6 (message_feedback, weak_queries, shared_conversations, forum_threads, forum_replies, forum_votes) |
