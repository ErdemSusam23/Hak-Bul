# Katkı Rehberi

Bu doküman tüm ekip üyeleri için geçerlidir. Hangi araçla geliştirme yaptığından bağımsız olarak bu kurallara uy.

---

## Döküman Güncelleme Kuralları

Kod değişikliğini commit etmeden önce aşağıdaki tabloyu kontrol et. İlgili doküman güncellenmemişse commit'e dahil et.

| Yaptığın değişiklik | Güncellenmesi gereken doküman |
|---|---|
| Endpoint eklendi / değişti / silindi | `docs/reference/api.md` |
| Alembic migration oluşturuldu, tablo/kolon değişti | `docs/reference/database.md` |
| RAG adımı değişti, model değişti, skor eşiği güncellendi | `docs/reference/rag-pipeline.md` |
| Yeni router / servis / mimari karar eklendi | `CLAUDE.md` |
| Kullanıcıya yönelik yeni özellik eklendi | `README.md` — sadece özellik listesi bölümü |

**Güncellenmesi gerekmeyen dokümanlar:**

- `docs/archive/*` — dondurulmuş, dokunma
- `docs/guides/env-setup.md` — yalnızca yeni env değişkeni eklenince
- `docs/reference/tech-spec.md` — yalnızca kapsam/gereksinim değişince

---

## Docs Klasörü Yapısı

```
docs/
├── reference/       # Teknik referans — kodla birlikte güncellenir
├── guides/          # Kurulum / işletim rehberleri
├── contributing/    # Katkı kuralları
├── architecture/    # Diyagramlar
├── audits/          # Audit raporları
├── tests/           # Test raporları
├── superpowers/     # Plan/spec dokümanları
└── archive/         # Dondurulmuş belgeler — salt okunur
```

---

## Test

Test çalıştırmadan önce kullanıcıya `local` mı `docker` mı istediğini sor. Varsayılan olarak Docker seçme.

```bash
# Tüm testler — Docker
docker exec hak-bul-backend python -m pytest tests/ -q

# Tek dosya — Docker
docker exec hak-bul-backend python -m pytest tests/test_feedback.py -v

# Tüm testler — Local (backend/ klasöründe)
python -m pytest tests/ -q

# Tek dosya — Local (backend/ klasöründe)
python -m pytest tests/test_feedback.py -v
```

Local ortamda bağımlılıklar kurulu olmayabilir; komutu seçmeden önce tercih edilen ortamın hazır olduğunu doğrula.
