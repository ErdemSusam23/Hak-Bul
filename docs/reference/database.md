# Veri Şeması

`backend-docs.md`'den bölündü — v2.0`

---

## PostgreSQL Şeması (Alembic)

Migrasyon zinciri: `20260305_0001` → `20260305_0002` → `20260316_0003` → `20260317_0004` → `20260317_0005` → `20260326_0006` → `20260326_0007` → `20260330_0008` → `20260330_0009`

| Tablo | Açıklama |
|-------|----------|
| `users` | Kayıtlı kullanıcılar (email, bcrypt hash, rol) |
| `refresh_tokens` | JWT refresh token'ları (rotation destekli) |
| `chat_history` | Kullanıcı + misafir mesajları; `user_id` XOR `guest_session_id` |
| `message_feedback` | `chat_history.id` FK; `puan` 1 / -1 |
| `weak_queries` | Düşük güven skorlu sorgular — retrieval kalitesi izleme için loglanır |
| `shared_conversations` | Sohbet paylaşma token'ları; `share_token` URL-safe, `is_active` ile devre dışı bırakılır |
| `forum_threads` | Forum başlıkları; sahip kullanıcı, kategori, kilit ve soft-delete alanları içerir |
| `forum_replies` | Forum yanıtları; başlığa ve kullanıcıya bağlıdır, doğrulama ve soft-delete destekler |
| `forum_votes` | Thread/reply oyları; kullanıcı başına hedef başına tek oy, değer 1 / -1 |

`users` tablosunda rol alanı `user | lawyer | admin` değerlerini alır.

`chat_history` önemli alanlar: `conversation_id`, `role` (user/assistant), `content`, `category`, `title`, `metadata_json` (asistan mesajlarında `{"kaynaklar": [...]}`), `deleted_at` (soft-delete; `NULL` = aktif, dolu = silinmiş).

### `weak_queries` Alanları

| Alan | Tip | Açıklama |
|------|-----|----------|
| `id` | UUID | PK |
| `soru` | text | Kullanıcının orijinal sorusu |
| `max_skor` | float | Retrieval sonucundaki en yüksek skor |
| `kategori` | string\|null | Tespit edilen hukuk kategorisi |
| `created_at` | datetime | Kayıt zamanı |

### `shared_conversations` Alanları

| Alan | Tip | Açıklama |
|------|-----|----------|
| `id` | UUID | PK |
| `share_token` | string(64) | URL-safe token (`secrets.token_urlsafe(24)`) |
| `conversation_id` | UUID | Paylaşılan sohbetin ID'si |
| `user_id` | UUID FK | Paylaşımı oluşturan kullanıcı (`users.id`, CASCADE) |
| `is_active` | bool | `false` yapılarak paylaşım devre dışı bırakılır |
| `created_at` | datetime | Oluşturulma zamanı |

### `forum_threads` Alanları

| Alan | Tip | Açıklama |
|------|-----|----------|
| `id` | UUID | PK |
| `user_id` | UUID FK | Başlığı açan kullanıcı (`users.id`, CASCADE) |
| `title` | string(200) | Başlık |
| `content` | text | İlk mesaj / başlık içeriği |
| `category` | string(50) | Forum kategorisi |
| `is_locked` | bool | Kilitliyse yeni yanıt yazılamaz |
| `created_at` | datetime | Oluşturulma zamanı |
| `updated_at` | datetime | Son güncelleme zamanı |
| `deleted_at` | datetime\|null | Soft-delete alanı |

### `forum_replies` Alanları

| Alan | Tip | Açıklama |
|------|-----|----------|
| `id` | UUID | PK |
| `thread_id` | UUID FK | Yanıtın ait olduğu başlık (`forum_threads.id`, CASCADE) |
| `user_id` | UUID FK | Yanıtı yazan kullanıcı (`users.id`, CASCADE) |
| `content` | text | Yanıt içeriği |
| `is_verified` | bool | `LAWYER`/`ADMIN` doğrulaması |
| `created_at` | datetime | Oluşturulma zamanı |
| `updated_at` | datetime | Son güncelleme zamanı |
| `deleted_at` | datetime\|null | Soft-delete alanı |

### `forum_votes` Alanları

| Alan | Tip | Açıklama |
|------|-----|----------|
| `id` | UUID | PK |
| `user_id` | UUID FK | Oyu veren kullanıcı (`users.id`, CASCADE) |
| `target_type` | enum | `thread` veya `reply` |
| `target_id` | UUID | Oy verilen thread/reply ID'si |
| `value` | int | `1` veya `-1` |
| `created_at` | datetime | Oluşturulma zamanı |

---

## Qdrant Koleksiyon Konfigürasyonu

| Parametre | Değer | Açıklama |
|-----------|-------|----------|
| Koleksiyon adı | `hukuk_chunks` | Tek koleksiyon, tüm chunk türleri burada |
| Vector size | `768` | intfloat/multilingual-e5-base |
| Distance metric | `Cosine` | Semantic benzerlik için en uygun metrik |
| Quantization | Kapalı (MVP) | Free tier için yeterli performans |
| Indexing threshold | 20.000 vektör | Qdrant default, MVP için sorun yok |

---

## Chunk Metadata Şeması

> Her chunk Qdrant'a hem embedding vektörü hem de aşağıdaki payload (metadata) ile birlikte yüklenir. Retrieval sonrasında kaynak atıfı bu alanlardan oluşturulur.

### Zorunlu Alanlar (tüm chunk türleri)

| Alan | Tip | Örnek Değer | Açıklama |
|------|-----|-------------|----------|
| `kaynak_turu` | string | `"kanun"` | `kanun` \| `yonetmelik` \| `yargitay_karari` |
| `hukuk_alani` | string | `"is_hukuku"` | MVP'de sabit, ilerleyen fazda genişler |
| `yil` | integer | `2003` | Yürürlük yılı veya karar yılı |
| `metin` | string | `"Madde 17 — ..."` | Chunk'un ham metni |
| `url` | string \| null | `"https://www.mevzuat.gov.tr/..."` | Kaynağın resmi bağlantısı (yoksa `null`) |
| `chunk_id` | string | `"kanun_4857_m17"` | Benzersiz ID, debug ve loglama için |

### Kanun Chunk'larına Özel Alanlar

| Alan | Tip | Örnek Değer |
|------|-----|-------------|
| `kanun_adi` | string | `"4857 Sayılı İş Kanunu"` |
| `kanun_no` | string | `"4857"` |
| `madde_no` | string | `"Madde 17"` |
| `fikra_no` | string \| null | `"Fıkra 2"` veya `null` |

### Yargıtay Kararı Chunk'larına Özel Alanlar

| Alan | Tip | Örnek Değer |
|------|-----|-------------|
| `karar_no` | string | `"2023/1234"` |
| `daire` | string | `"9. Hukuk Dairesi"` |
| `karar_bolumu` | string | `ozet` \| `gerekce` \| `sonuc` |
| `tarih` | string | `"2023-05-12"` |

### Örnek Chunk — Kanun

```json
{
  "id": "kanun_4857_m17",
  "vector": [0.023, -0.441, "..."],
  "payload": {
    "kaynak_turu": "kanun",
    "hukuk_alani": "is_hukuku",
    "kanun_adi": "4857 Sayılı İş Kanunu",
    "kanun_no": "4857",
    "madde_no": "Madde 17",
    "fikra_no": null,
    "yil": 2003,
    "metin": "Madde 17 — Belirsiz süreli iş sözleşmelerinin...",
    "url": "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=4857&MevzuatTur=1&MevzuatTertip=5",
    "chunk_id": "kanun_4857_m17"
  }
}
```

### Örnek Chunk — Yargıtay Kararı

```json
{
  "id": "yargitay_2023_1234_gerekce",
  "vector": [0.091, 0.317, "..."],
  "payload": {
    "kaynak_turu": "yargitay_karari",
    "hukuk_alani": "is_hukuku",
    "karar_no": "2023/1234",
    "daire": "9. Hukuk Dairesi",
    "karar_bolumu": "gerekce",
    "tarih": "2023-05-12",
    "yil": 2023,
    "metin": "...kıdem tazminatına hak kazanabilmek için...",
    "url": "https://karararama.yargitay.gov.tr/",
    "chunk_id": "yargitay_2023_1234_gerekce"
  }
}
```

---

## Veri Hacmi Tahmini

| İçerik | Adet | Tahmini Chunk | Vektör Boyutu |
|--------|------|---------------|---------------|
| Kanun metinleri | 3-5 kanun | ~1.000-2.000 | ~6-12 MB |
| Yargıtay kararları | 500-1.000 karar | ~2.000-3.000 | ~12-18 MB |
| **Toplam** | — | **~3.000-5.000** | **~18-30 MB** (Qdrant 1GB free tier içinde) |
