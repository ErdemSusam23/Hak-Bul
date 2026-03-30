# Forum Tasarım Dokümanı

**Tarih:** 2026-03-30
**Durum:** Onaylandı

---

## Genel Bakış

Hak-Bul uygulamasına kullanıcıların hukuki sorularını paylaşabildiği, diğer kullanıcıların yanıtlayabildiği ve onaylı avukatların (LAWYER rolü) doğrulanmış cevaplar verebildiği bir forum eklenmesi planlanmaktadır.

---

## Rol Sistemi Değişikliği

Mevcut `UserRole` enum'una `LAWYER` rolü eklenir:

```python
class UserRole(str, Enum):
    USER = "user"
    LAWYER = "lawyer"   # yeni
    ADMIN = "admin"
```

- `LAWYER` rolü admin paneline (kullanıcı yönetimi, istatistikler) erişemez.
- LAWYER rolü yalnızca ADMIN tarafından atanır (mevcut `/admin/users/{id}/role` endpoint'i kullanılır).
- Yetki hiyerarşisi: `USER < LAWYER < ADMIN`

---

## Veri Modeli

### `forum_threads`

| Kolon | Tip | Açıklama |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | FK → users (CASCADE) | Başlığı açan kullanıcı |
| `title` | VARCHAR(200) | |
| `content` | TEXT | |
| `category` | VARCHAR(50) | Mevcut 8 kategoriden biri |
| `is_locked` | BOOLEAN DEFAULT FALSE | Kilitli başlığa yeni yanıt yazılamaz |
| `created_at` | DATETIME | |
| `updated_at` | DATETIME | |
| `deleted_at` | DATETIME nullable | Soft delete |

### `forum_replies`

| Kolon | Tip | Açıklama |
|---|---|---|
| `id` | UUID PK | |
| `thread_id` | FK → forum_threads (CASCADE) | |
| `user_id` | FK → users (CASCADE) | Yanıtı yazan kullanıcı |
| `content` | TEXT | |
| `is_verified` | BOOLEAN DEFAULT FALSE | Sadece LAWYER işaretleyebilir |
| `created_at` | DATETIME | |
| `updated_at` | DATETIME | |
| `deleted_at` | DATETIME nullable | Soft delete |

### `forum_votes`

| Kolon | Tip | Açıklama |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | FK → users (CASCADE) | |
| `target_type` | ENUM(thread, reply) | Oy verilen içerik tipi |
| `target_id` | VARCHAR(36) | Thread veya reply ID'si |
| `value` | INTEGER CHECK(1, -1) | 👍 = 1, 👎 = -1 |
| `created_at` | DATETIME | |

**Constraint:** `UNIQUE(user_id, target_type, target_id)` — Aynı kullanıcı aynı içeriğe bir oy verebilir; tekrar oy verirse güncellenir.

---

## Yetki Matrisi

| Aksiyon | GUEST | USER | LAWYER | ADMIN |
|---|---|---|---|---|
| Thread listesi / detay görme | ✓ | ✓ | ✓ | ✓ |
| Thread açma | ✗ | ✓ | ✓ | ✓ |
| Kendi thread'ini düzenleme | ✗ | ✓ | ✓ | ✓ |
| Kendi thread'ini silme | ✗ | ✓ | ✓ | ✓ |
| Herhangi thread'i silme | ✗ | ✗ | ✓ | ✓ |
| Thread kilitleme/açma | ✗ | ✗ | ✓ | ✓ |
| Yanıt yazma | ✗ | ✓ | ✓ | ✓ |
| Kendi yanıtını düzenleme/silme | ✗ | ✓ | ✓ | ✓ |
| Herhangi yanıtı silme | ✗ | ✗ | ✓ | ✓ |
| Yanıtı "Onaylı" işaretleme/kaldırma | ✗ | ✗ | ✓ | ✓ |
| Oy verme (thread/reply) | ✗ | ✓ | ✓ | ✓ |
| LAWYER rolü atama | ✗ | ✗ | ✗ | ✓ |

---

## API Endpoint'leri

### Thread'ler

```
GET    /forum/threads                    # Liste; ?category=&page=&size= filtresi
POST   /forum/threads                    # Yeni başlık (USER+)
GET    /forum/threads/{id}               # Detay + yanıtlar
PUT    /forum/threads/{id}               # Düzenle (sahip)
DELETE /forum/threads/{id}               # Sil (sahip veya LAWYER+)
PATCH  /forum/threads/{id}/lock          # Kilitle/aç (LAWYER+)
```

### Yanıtlar

```
POST   /forum/threads/{id}/replies       # Yanıt ekle (USER+; kilitli thread'e yasak)
PUT    /forum/replies/{id}               # Düzenle (sahip)
DELETE /forum/replies/{id}               # Sil (sahip veya LAWYER+)
PATCH  /forum/replies/{id}/verify        # Onaylı işaretle/kaldır (LAWYER+)
```

### Oylar

```
POST   /forum/threads/{id}/vote          # Oy ver/güncelle (USER+)
POST   /forum/replies/{id}/vote          # Oy ver/güncelle (USER+)
```

### Admin (mevcut endpoint, değişiklik yok)

```
PATCH  /admin/users/{id}/role            # LAWYER rolü atama zaten bu endpoint ile yapılır
```

---

## Frontend Yapısı

### Yeni Sayfalar

**`ForumSayfasi.jsx`**
- Kategori filtresi (8 kategori + "Tümü")
- Thread kartları: başlık, yazar, kategori etiketi, yanıt sayısı, oy sayısı, tarih, kilit ikonu
- "Yeni Başlık Aç" butonu (giriş yapılmışsa görünür)
- Sayfalama

**`ForumBaslikSayfasi.jsx`**
- Thread içeriği + oy butonları
- Sahip ise düzenle/sil; LAWYER/ADMIN ise sil + kilitle butonu
- Yanıtlar listesi:
  - Onaylı yanıt en üstte sabitlenir, yeşil "Onaylı Cevap" rozeti
  - Her yanıtta oy butonları
  - LAWYER ise "Onaylı İşaretle" butonu
- Yanıt yazma kutusu (giriş yapılmamışsa "yanıt yazmak için giriş yapın" uyarısı)

### Routing (hash-based, mevcut pattern)

```
#/forum              → ForumSayfasi
#/forum/{thread_id}  → ForumBaslikSayfasi
```

### Sidebar

Sohbet Geçmişi ile Taslaklar arasına eklenir:
```
💬  Sohbet
📋  Forum          ← yeni (tüm kullanıcılar görür)
📄  Taslaklar
```

---

## Migration Zinciri

```
20260326_0007_add_deleted_at_to_chat_history
    ↓
20260330_0008_add_lawyer_role_to_userrole_enum
    ↓
20260330_0009_create_forum_tables
```

- `0008`: PostgreSQL'de `ALTER TYPE userrole ADD VALUE 'lawyer'` — SQLite için enum yeniden oluşturulur.
- `0009`: `forum_threads`, `forum_replies`, `forum_votes` tabloları + `forumvotetype` enum.

---

## Kapsam Dışı

- Bildirim sistemi (email / uygulama içi)
- RAG pipeline entegrasyonu
- Misafir kullanıcıların forum'a yazması
- Forum kategori yönetimi (kategoriler mevcut 8 kategoriye sabit)
