# Veri Şeması

Bu belge ilişkisel uygulama verisini, migration zincirini ve retrieval veri yüzeyini özetler.
Production ortamında ana ilişkisel veritabanı PostgreSQL olarak hedeflenir; local geliştirmede
`DATABASE_URL` verilmezse varsayılan bağlantı `sqlite:///./hakbul.db` olur.

## Alembic Zinciri

```text
20260305_0001  auth tabloları
    ->
20260305_0002  chat_history + guest support
    ->
20260316_0003  chat_history.category
    ->
20260317_0004  message_feedback
    ->
20260317_0005  chat_history.title
    ->
20260326_0006  weak_queries + shared_conversations
    ->
20260326_0007  chat_history.deleted_at
    ->
20260330_0008  user role: lawyer
    ->
20260330_0009  forum tabloları
    ->
20260428_0010  local/dev demo seed verisi
```

Not:
- `20260428_0010` şema değiştirmez.
- Sadece `APP_ENV=local|dev|development` olduğunda demo kullanıcı, forum, chat, feedback ve shared conversation verisi üretir.

## İlişkisel Veritabanı Tabloları

| Tablo | Açıklama |
|---|---|
| `users` | Kayıtlı kullanıcılar |
| `refresh_tokens` | Refresh token rotation kayıtları |
| `chat_history` | Kullanıcı ve guest mesaj geçmişi |
| `message_feedback` | Asistan mesajı puanları |
| `weak_queries` | Düşük retrieval güven skorlu sorular |
| `shared_conversations` | Sohbet paylaşım tokenları |
| `forum_threads` | Forum başlıkları |
| `forum_replies` | Forum yanıtları |
| `forum_votes` | Forum oyları |

## `users`

Önemli alanlar:
- `id`
- `email` unique
- `password_hash`
- `is_active`
- `role`: `user | lawyer | admin`
- `created_at`
- `updated_at`

## `refresh_tokens`

Amaç:
- Refresh token hash saklama
- Rotation ve revocation izleme

Tipik alanlar:
- `id`
- `user_id`
- `jti`
- `token_hash`
- `expires_at`
- `revoked_at`
- `replaced_by_jti`

## `chat_history`

Önemli alanlar:
- `id`
- `user_id` veya `guest_session_id`
- `conversation_id`
- `role`: `system | user | assistant`
- `content`
- `title`
- `category`
- `metadata_json`
- `created_at`
- `deleted_at`

Kurallar:
- `user_id` ve `guest_session_id` için XOR constraint vardır.
- Silme işlemleri `deleted_at` ile soft-delete olarak yapılır.
- Asistan mesajlarında `metadata_json` içinde `{"kaynaklar": [...]}` saklanır.

## `message_feedback`

| Alan | Açıklama |
|---|---|
| `message_id` | `chat_history.id` FK |
| `puan` | `1` veya `-1` |
| `user_id` | Auth kullanıcı için |
| `guest_session_id` | Guest kullanım için |
| `created_at` | Kayıt zamanı |

Davranış:
- Aynı kullanıcı veya guest oturumu aynı mesaja yeniden oy verirse servis katmanı mevcut kaydı günceller.
- Bu davranış DB-level unique constraint ile değil, `feedback_service.py` içindeki sorgu mantığıyla sağlanır.
- `user_id` ve `guest_session_id` için `chat_history` tablosundaki gibi DB-level XOR constraint yoktur.

## `weak_queries`

| Alan | Açıklama |
|---|---|
| `id` | PK |
| `soru` | Orijinal kullanıcı sorusu |
| `max_skor` | En yüksek retrieval skoru |
| `kategori` | Tespit edilen kategori |
| `created_at` | Oluşturulma zamanı |

## `shared_conversations`

| Alan | Açıklama |
|---|---|
| `id` | PK |
| `share_token` | URL-safe token |
| `conversation_id` | Paylaşılan sohbet ID'si |
| `user_id` | Sahip kullanıcı |
| `is_active` | Paylaşım açık mı |
| `created_at` | Oluşturulma zamanı |

## Forum Tabloları

### `forum_threads`

| Alan | Açıklama |
|---|---|
| `id` | PK |
| `user_id` | Başlığı açan kullanıcı |
| `title` | Başlık |
| `content` | İlk mesaj |
| `category` | Forum kategorisi |
| `is_locked` | Kilitli mi |
| `created_at` | Oluşturulma zamanı |
| `updated_at` | Güncellenme zamanı |
| `deleted_at` | Soft-delete |

### `forum_replies`

| Alan | Açıklama |
|---|---|
| `id` | PK |
| `thread_id` | Ait olduğu başlık |
| `user_id` | Yanıt sahibi |
| `content` | Yanıt içeriği |
| `is_verified` | `LAWYER`/`ADMIN` doğrulaması |
| `created_at` | Oluşturulma zamanı |
| `updated_at` | Güncellenme zamanı |
| `deleted_at` | Soft-delete |

### `forum_votes`

| Alan | Açıklama |
|---|---|
| `id` | PK |
| `user_id` | Oyu veren kullanıcı |
| `target_type` | `thread` veya `reply` |
| `target_id` | Hedef kayıt ID'si |
| `value` | `1` veya `-1` |
| `created_at` | Oluşturulma zamanı |

Kurallar:
- `user_id + target_type + target_id` unique constraint vardır.
- `value IN (1, -1)` check constraint vardır.

## Qdrant Yapısı

Güncel yapı:
- Ana collection: `settings.COLLECTION_NAME` varsayılan `hukuk_chunks`
- Opsiyonel ikinci collection: `settings.COLLECTION_KANUN_NAME`
- Distance metric: cosine
- Embedding model: `intfloat/multilingual-e5-base`

Konumlandırma:
- Qdrant ilişkisel uygulama veritabanı değildir; vector database / retrieval store olarak kullanılır.
- PostgreSQL/SQLite tarafındaki tablolarla foreign key ilişkisi yoktur.
- Kullanıcı, sohbet, forum, token ve paylaşım state'i ilişkisel veritabanında tutulur.
- Hukuki kaynak parçaları, embedding vektörleri ve kaynak metadata'sı Qdrant payload'larında tutulur.
- Asistan cevaplarında kullanılan kaynak özetleri `chat_history.metadata_json` içine yazılabilir.

## Local Retrieval Corpus

- Dizin: `backend/data/processed_backup_*`
- Güncel fallback seti: 33 JSON dosyası
- Qdrant yoksa veya erişilemiyorsa `ALLOW_LOCAL_RETRIEVAL_FALLBACK=true` ile devreye girer.

## Chunk Metadata

Sık kullanılan payload alanları:
- `chunk_id`
- `kaynak_turu`
- `kanun_adi`
- `kanun_no`
- `madde_no`
- `fikra_no`
- `metin`
- `hukuk_alani`
- `yil`
- `daire`
- `karar_no`

`kaynak_turu` pratikte en sık:
- `kanun`
- `yargitay_karari`

## Notlar

- `/search` ve `/ask` response'larında kaynak başlıkları payload verisinden üretilir.
- Kanun URL'leri sabit mevzuat haritasından türetilir; Qdrant payload içinde zorunlu değildir.
- Mulga maddeler retrieval sonrası filtrelenir; tamamen mulga metinler local index'e alınmaz.
