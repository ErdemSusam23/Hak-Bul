# Bitirme Projesi Özellikler İmplementasyon Planı

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hak-Bul hukuki asistan uygulamasına 7 yeni özellik eklemek: embedding model yükseltmesi, soru kategorilendirme, cevap puanlama, PDF doküman analizi, hukuki belge taslağı, admin analytics dashboard ve çok dilli destek.

**Architecture:** Her özellik bağımsız bir subsystem olarak tasarlanmıştır — birbirini etkilemeden paralel geliştirilebilir. Backend FastAPI + SQLAlchemy + RAG pipeline yapısı korunur; frontend React Context + hooks pattern ile genişletilir.

**Tech Stack:** FastAPI, SQLAlchemy 2.0, Alembic, React 19, Tailwind CSS, Groq API, Qdrant, pypdf, reportlab, i18next

---

## Scope Notu

Bu plan **7 bağımsız özelliği** kapsar. Her bir özellik kendi başına çalışan, test edilebilir bir birim üretir. Uygulama sırası önerilir ama zorunlu değil:

1. **Embedding Model Upgrade** (en basit, temel değişiklik)
2. **Soru Kategorilendirme** (pipeline'a entegre)
3. **Cevap Puanlama (Feedback)** (yeni model + endpoint)
4. **PDF Doküman Yükleme & Analizi** (büyük özellik)
5. **Hukuki Belge Taslağı** (büyük özellik)
6. **Admin Analytics Dashboard** (orta büyüklük)
7. **Çok Dilli Destek (TR/EN)** (frontend ağırlıklı)

---

## File Structure (Genel Bakış)

### Yeni Dosyalar

```
backend/
├── rag/
│   └── categorizer.py          # Soru kategorilendirme modülü
├── routers/
│   ├── feedback.py             # Cevap puanlama endpoint'leri
│   ├── documents.py            # PDF yükleme & analiz endpoint'leri
│   ├── templates.py            # Hukuki belge taslağı endpoint'leri
│   └── admin.py                # Admin analytics endpoint'leri
├── models/
│   └── feedback.py             # MessageFeedback ORM modeli
├── services/
│   ├── feedback_service.py     # Feedback iş mantığı
│   ├── document_service.py     # PDF işleme iş mantığı
│   └── template_service.py     # Belge taslağı üretim mantığı
├── alembic/versions/
│   ├── 20260316_0003_add_feedback_table.py
│   ├── 20260316_0004_add_category_to_chat.py
│   └── 20260316_0005_add_document_uploads.py
└── templates/
    ├── kira_sozlesmesi.py      # Kira sözleşmesi şablonu
    ├── is_akdi_feshi.py        # İş akdi feshi ihtarnamesi şablonu
    └── vekaletname.py          # Vekaletname şablonu

frontend/src/
├── components/
│   ├── FeedbackButonlari.jsx   # 👍/👎 butonları
│   ├── DokumanYukleme.jsx      # PDF yükleme arayüzü
│   ├── BelgeTaslagi.jsx        # Taslak form & önizleme
│   ├── AdminDashboard.jsx      # Analytics dashboard
│   └── DilSecici.jsx           # Dil seçim dropdown
├── pages/
│   └── AdminSayfasi.jsx        # Admin sayfası
├── locales/
│   ├── tr.json                 # Türkçe çeviriler
│   └── en.json                 # İngilizce çeviriler
└── context/
    └── DilContext.jsx          # Dil state yönetimi
```

### Değiştirilecek Mevcut Dosyalar

```
backend/
├── config.py                   # EMBEDDING_MODEL değiştirilecek
├── rag/retriever.py            # multilingual-e5-base yüklemesi
├── rag/pipeline.py             # category bilgisi eklenecek
├── schemas.py                  # Yeni request/response modeller
├── main.py                     # Yeni router'lar kayıt edilecek
└── models/chat_history.py      # category kolonu eklenecek

frontend/src/
├── components/SohbetMesaji.jsx # Feedback butonları eklenecek
├── components/GecmisPanel.jsx  # Kategori filtresi eklenecek
├── App.jsx                     # Admin route + DilProvider
├── api/client.js               # Yeni API fonksiyonları
└── main.jsx                    # i18n provider
```

---

## Chunk 1: Embedding Model Upgrade + Soru Kategorilendirme

---

### Task 1: Embedding Model — multilingual-e5-base

**Files:**
- Modify: `backend/config.py`
- Modify: `backend/rag/retriever.py`

> **Not:** Mevcut `retriever.py`'de `SentenceTransformer` kullanılıyor. multilingual-e5-base modeli için prompt prefix gerekir: sorguları `"query: "` ile, belgeleri `"passage: "` ile prefix'lemek gerekir.

- [ ] **Step 1: config.py'de model adını güncelle**

`backend/config.py` içindeki `EMBEDDING_MODEL` değerini değiştir:

```python
# config.py içinde Settings class'ında
EMBEDDING_MODEL: str = "intfloat/multilingual-e5-base"
```

- [ ] **Step 2: retriever.py'de query prefix'ini uygula**

`backend/rag/retriever.py` içinde embedding üretilen yerlerde prefix ekle. Qdrant için query encode:

```python
# retriever.py içinde Qdrant sorgusu yapan yerde
def _encode_query(self, query: str) -> list[float]:
    """multilingual-e5-base için query prefix gereklidir."""
    prefixed = f"query: {query}"
    return self.model.encode(prefixed, normalize_embeddings=True).tolist()
```

Yerel JSON indeksleme sırasında belge encode için:

```python
def _encode_passage(self, text: str) -> list[float]:
    """multilingual-e5-base için passage prefix gereklidir."""
    prefixed = f"passage: {text}"
    return self.model.encode(prefixed, normalize_embeddings=True).tolist()
```

- [ ] **Step 3: Mevcut `encode` çağrılarını yeni metodlara bağla**

`retriever.py` içinde `self.model.encode(...)` çağrılarını bul, sorgu için `_encode_query`, belge için `_encode_passage` kullan.

- [ ] **Step 4: Test — backend'i başlatıp sağlık kontrolü yap**

```bash
cd backend
python -m pytest tests/ -v -k "test_health or test_search"
```

Beklenen: Model yüklensin, testler geçsin.

- [ ] **Step 5: Manuel smoke test**

```bash
curl -X POST http://localhost:8000/ask \
  -H "Content-Type: application/json" \
  -d '{"soru": "Kira sözleşmesi nasıl feshedilir?"}'
```

Beklenen: Anlamlı Türkçe cevap gelsin.

- [ ] **Step 6: Commit**

```bash
git add backend/config.py backend/rag/retriever.py
git commit -m "feat: upgrade embedding model to multilingual-e5-base"
```

---

### Task 2: Soru Kategorilendirme — Backend

**Files:**
- Create: `backend/rag/categorizer.py`
- Modify: `backend/rag/pipeline.py`
- Modify: `backend/schemas.py`
- Modify: `backend/models/chat_history.py`
- Create: `backend/alembic/versions/20260316_0004_add_category_to_chat.py`

**Step 1: Failing test yaz**

- [ ] `backend/tests/test_categorizer.py` oluştur:

```python
import pytest
from backend.rag.categorizer import SoruKategorilendiricisi

@pytest.fixture
def kategorilendirici():
    return SoruKategorilendiricisi()

def test_is_hukuku_kategorisi(kategorilendirici):
    soru = "İşten çıkarılma tazminatı nasıl hesaplanır?"
    kategori = kategorilendirici.kategorile(soru)
    assert kategori == "İş Hukuku"

def test_aile_hukuku_kategorisi(kategorilendirici):
    soru = "Boşanma davası nasıl açılır?"
    kategori = kategorilendirici.kategorile(soru)
    assert kategori == "Aile Hukuku"

def test_bilinmeyen_kategori(kategorilendirici):
    soru = "xyzzy anlamsız soru"
    kategori = kategorilendirici.kategorile(soru)
    assert kategori == "Genel"
```

- [ ] **Step 2: Testi çalıştır — başarısız olduğunu doğrula**

```bash
cd backend
python -m pytest tests/test_categorizer.py -v
```

Beklenen: `ModuleNotFoundError` — `categorizer.py` henüz yok.

- [ ] **Step 3: `backend/rag/categorizer.py` oluştur**

```python
"""Soru kategorilendirme modülü — anahtar kelime tabanlı hızlı sınıflandırma."""

KATEGORI_ANAHTAR_KELIMELERI = {
    "İş Hukuku": [
        "işten çıkarma", "tazminat", "kıdem", "ihbar", "iş akdi",
        "sendika", "grev", "fazla mesai", "ücret", "işçi", "işveren",
        "iş sözleşmesi", "mobbing", "istifa"
    ],
    "Ceza Hukuku": [
        "suç", "ceza", "hapis", "dava", "savcı", "yargılama",
        "kovuşturma", "beraat", "mahkumiyet", "şikayet", "tutuklama",
        "gözaltı", "hırsızlık", "dolandırıcılık", "yaralama"
    ],
    "Aile Hukuku": [
        "boşanma", "nafaka", "velayet", "evlilik", "miras",
        "veraset", "çocuk", "eş", "evlat edinme", "aile"
    ],
    "Tüketici Hukuku": [
        "tüketici", "iade", "garanti", "ayıplı mal", "alışveriş",
        "e-ticaret", "sipariş", "fatura", "reklamcılık", "kampanya"
    ],
    "Kira Hukuku": [
        "kira", "kiracı", "ev sahibi", "tahliye", "kira artışı",
        "depozito", "konut", "kiralık"
    ],
    "İdare Hukuku": [
        "devlet", "belediye", "kamu", "yönetim", "idare",
        "vergi", "para cezası", "lisans", "izin", "ruhsat"
    ],
}

VARSAYILAN_KATEGORI = "Genel"


class SoruKategorilendiricisi:
    """Anahtar kelime eşleştirmesi ile soruları hukuki kategorilere ayırır."""

    def kategorile(self, soru: str) -> str:
        soru_kucuk = soru.lower()
        en_iyi_kategori = VARSAYILAN_KATEGORI
        en_yuksek_eslesme = 0

        for kategori, kelimeler in KATEGORI_ANAHTAR_KELIMELERI.items():
            eslesme_sayisi = sum(1 for k in kelimeler if k in soru_kucuk)
            if eslesme_sayisi > en_yuksek_eslesme:
                en_yuksek_eslesme = eslesme_sayisi
                en_iyi_kategori = kategori

        return en_iyi_kategori
```

- [ ] **Step 4: Testleri çalıştır — geçtiğini doğrula**

```bash
cd backend
python -m pytest tests/test_categorizer.py -v
```

Beklenen: 3 test PASS.

- [ ] **Step 5: chat_history modeline `category` kolonu ekle**

`backend/models/chat_history.py` içine ekle:

```python
from sqlalchemy import Column, String
# Mevcut sütunların yanına:
category = Column(String(50), nullable=True)
```

- [ ] **Step 6: Alembic migrasyonu oluştur**

`backend/alembic/versions/20260316_0004_add_category_to_chat.py`:

```python
"""add category to chat_history

Revision ID: 20260316_0004
Revises: 20260305_0002
Create Date: 2026-03-16
"""
from alembic import op
import sqlalchemy as sa

revision = "20260316_0004"
down_revision = "20260305_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "chat_history",
        sa.Column("category", sa.String(50), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("chat_history", "category")
```

- [ ] **Step 7: `backend/rag/pipeline.py`'de kategori entegrasyonu**

`pipeline.py` içindeki `RAGPipeline.yanit_uret` (veya ana metodun) sonuç döndürmeden önce:

```python
from backend.rag.categorizer import SoruKategorilendiricisi

# __init__ içinde:
self.kategorilendirici = SoruKategorilendiricisi()

# yanit_uret metodunda, return'den önce:
kategori = self.kategorilendirici.kategorile(soru)
# ... mevcut sonuç dict'ine ekle:
return {
    "yanit": yanit,
    "kaynaklar": kaynaklar,
    "kategori": kategori,
    # ... diğer alanlar
}
```

- [ ] **Step 8: `schemas.py`'de response modeline `kategori` ekle**

```python
class SoruCevap(BaseModel):  # veya mevcut response sınıfının adı
    yanit: str
    kaynaklar: list
    kategori: str = "Genel"
    # ... diğer mevcut alanlar
```

- [ ] **Step 9: `chat_service.py`'de kategoriyi kaydet**

`backend/services/chat_service.py` içinde mesaj kaydedilen yerde:

```python
# ChatHistory oluştururken category parametresini ekle
db_message = ChatHistory(
    ...,
    category=category,  # pipeline'dan gelen kategori
)
```

- [ ] **Step 10: Integration test**

```bash
cd backend
python -m pytest tests/ -v
```

Beklenen: Tüm testler PASS.

- [ ] **Step 11: Commit**

```bash
git add backend/rag/categorizer.py backend/models/chat_history.py \
        backend/alembic/versions/20260316_0004_add_category_to_chat.py \
        backend/rag/pipeline.py backend/schemas.py backend/services/chat_service.py \
        backend/tests/test_categorizer.py
git commit -m "feat: add question categorization to RAG pipeline"
```

---

### Task 3: Kategori Filtresi — Frontend

**Files:**
- Modify: `frontend/src/components/GecmisPanel.jsx`
- Modify: `frontend/src/api/client.js`

- [ ] **Step 1: `client.js`'e kategori filtreli sohbet geçmişi fonksiyonu ekle**

```javascript
// frontend/src/api/client.js
export async function getSohbetGecmisi(kategori = null) {
  const params = kategori ? { category: kategori } : {};
  const { data } = await apiClient.get("/chat/conversations", { params });
  return data;
}
```

- [ ] **Step 2: `GecmisPanel.jsx`'e kategori filtresi ekle**

`GecmisPanel.jsx` içinde mevcut chat listesinin üstüne:

```jsx
const KATEGORILER = [
  "Tümü", "İş Hukuku", "Ceza Hukuku", "Aile Hukuku",
  "Tüketici Hukuku", "Kira Hukuku", "İdare Hukuku", "Genel"
];

// State:
const [aktifKategori, setAktifKategori] = useState("Tümü");

// UI (Tailwind):
<div className="flex flex-wrap gap-1 p-2">
  {KATEGORILER.map(k => (
    <button
      key={k}
      onClick={() => setAktifKategori(k)}
      className={`text-xs px-2 py-1 rounded-full border transition-colors ${
        aktifKategori === k
          ? "bg-blue-600 text-white border-blue-600"
          : "border-gray-300 text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-400"
      }`}
    >
      {k}
    </button>
  ))}
</div>
```

- [ ] **Step 3: Filtre mantığını bağla**

Geçmiş listesini filtrele:

```jsx
const filtreliSohbetler = aktifKategori === "Tümü"
  ? sohbetler
  : sohbetler.filter(s => s.category === aktifKategori);
```

- [ ] **Step 4: Manuel test**

Frontend'i başlat, GecmisPanel'de kategori butonlarının göründüğünü ve tıklandığında filtreleme yaptığını doğrula.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/GecmisPanel.jsx frontend/src/api/client.js
git commit -m "feat: add category filter to chat history panel"
```

---

## Chunk 2: Cevap Puanlama (Feedback)

---

### Task 4: Feedback — Backend Model & Migration

**Files:**
- Create: `backend/models/feedback.py`
- Modify: `backend/models/__init__.py`
- Create: `backend/alembic/versions/20260316_0003_add_feedback_table.py`

- [ ] **Step 1: Failing test yaz**

`backend/tests/test_feedback.py`:

```python
import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_feedback_endpoint_exists():
    """Feedback endpoint'i var olmalı."""
    response = client.post("/feedback", json={
        "message_id": "00000000-0000-0000-0000-000000000001",
        "puan": 1,
        "guest_session_id": "test-session"
    })
    # 404 değil, 200 veya 422 (validation) dönmeli
    assert response.status_code != 404

def test_feedback_invalid_puan():
    """Puan 1 veya -1 olmalı."""
    response = client.post("/feedback", json={
        "message_id": "00000000-0000-0000-0000-000000000001",
        "puan": 5,  # geçersiz
        "guest_session_id": "test-session"
    })
    assert response.status_code == 422
```

- [ ] **Step 2: Testi çalıştır — başarısız olduğunu doğrula**

```bash
cd backend
python -m pytest tests/test_feedback.py::test_feedback_endpoint_exists -v
```

Beklenen: FAIL (404).

- [ ] **Step 3: `backend/models/feedback.py` oluştur**

```python
"""MessageFeedback ORM modeli — kullanıcı 👍/👎 oylaması."""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from backend.db.base import Base


class MessageFeedback(Base):
    __tablename__ = "message_feedback"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id = Column(
        UUID(as_uuid=True),
        ForeignKey("chat_history.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # +1 = beğendi, -1 = beğenmedi
    puan = Column(Integer, nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    guest_session_id = Column(String(36), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        # Aynı mesaja aynı kullanıcı/session birden fazla oy veremez
        # (uygulama seviyesinde kontrol edilir)
    )
```

- [ ] **Step 4: `backend/models/__init__.py`'e ekle**

```python
from backend.models.feedback import MessageFeedback  # noqa
```

- [ ] **Step 5: Alembic migrasyonu oluştur**

`backend/alembic/versions/20260316_0003_add_feedback_table.py`:

```python
"""add message_feedback table

Revision ID: 20260316_0003
Revises: 20260316_0004
Create Date: 2026-03-16
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260316_0003"
down_revision = "20260316_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "message_feedback",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("message_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("chat_history.id", ondelete="CASCADE"), nullable=False),
        sa.Column("puan", sa.Integer(), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("guest_session_id", sa.String(36), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_message_feedback_message_id", "message_feedback", ["message_id"])
    op.create_check_constraint(
        "ck_feedback_puan",
        "message_feedback",
        "puan IN (1, -1)"
    )


def downgrade() -> None:
    op.drop_table("message_feedback")
```

- [ ] **Step 6: Commit**

```bash
git add backend/models/feedback.py backend/models/__init__.py \
        backend/alembic/versions/20260316_0003_add_feedback_table.py
git commit -m "feat: add MessageFeedback model and migration"
```

---

### Task 5: Feedback — Backend Router & Service

**Files:**
- Create: `backend/services/feedback_service.py`
- Create: `backend/routers/feedback.py`
- Modify: `backend/schemas.py`
- Modify: `backend/main.py`

- [ ] **Step 1: `schemas.py`'e feedback şemaları ekle**

```python
class FeedbackGonder(BaseModel):
    message_id: UUID
    puan: int  # 1 veya -1
    guest_session_id: str | None = None

    @field_validator("puan")
    @classmethod
    def puan_gecerli_olmali(cls, v):
        if v not in (1, -1):
            raise ValueError("Puan 1 (beğendi) veya -1 (beğenmedi) olmalıdır")
        return v

class FeedbackCevap(BaseModel):
    basarili: bool
    mesaj: str
```

- [ ] **Step 2: `backend/services/feedback_service.py` oluştur**

```python
"""Feedback kaydetme ve istatistik servisi."""
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.models.feedback import MessageFeedback


def feedback_kaydet(
    db: Session,
    message_id: UUID,
    puan: int,
    user_id: UUID | None = None,
    guest_session_id: str | None = None,
) -> MessageFeedback:
    """Mevcut feedback varsa güncelle, yoksa oluştur."""
    filtre = {"message_id": message_id}
    if user_id:
        filtre["user_id"] = str(user_id)
    elif guest_session_id:
        filtre["guest_session_id"] = guest_session_id

    mevcut = db.query(MessageFeedback).filter_by(**filtre).first()
    if mevcut:
        mevcut.puan = puan
        db.commit()
        return mevcut

    yeni = MessageFeedback(
        message_id=message_id,
        puan=puan,
        user_id=user_id,
        guest_session_id=guest_session_id,
    )
    db.add(yeni)
    db.commit()
    db.refresh(yeni)
    return yeni


def mesaj_puani_getir(db: Session, message_id: UUID) -> dict:
    """Bir mesajın toplam puanını döndür."""
    sonuc = (
        db.query(func.sum(MessageFeedback.puan))
        .filter(MessageFeedback.message_id == message_id)
        .scalar()
    )
    return {"message_id": str(message_id), "toplam_puan": sonuc or 0}
```

- [ ] **Step 3: `backend/routers/feedback.py` oluştur**

```python
"""Cevap puanlama endpoint'leri."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.db.session import get_db
from backend.schemas import FeedbackGonder, FeedbackCevap
from backend.services.feedback_service import feedback_kaydet
from backend.auth.dependencies import get_current_user_optional

router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.post("", response_model=FeedbackCevap)
async def feedback_gonder(
    veri: FeedbackGonder,
    db: Session = Depends(get_db),
    mevcut_kullanici=Depends(get_current_user_optional),
):
    """Bir cevaba 👍 veya 👎 ver."""
    if not mevcut_kullanici and not veri.guest_session_id:
        raise HTTPException(
            status_code=400,
            detail="Kullanıcı girişi veya guest_session_id gereklidir",
        )

    feedback_kaydet(
        db=db,
        message_id=veri.message_id,
        puan=veri.puan,
        user_id=mevcut_kullanici.id if mevcut_kullanici else None,
        guest_session_id=veri.guest_session_id,
    )
    return FeedbackCevap(basarili=True, mesaj="Geri bildirim kaydedildi")
```

> **Not:** `get_current_user_optional` dependency'si mevcut `dependencies.py`'de yoksa ekle — token yoksa `None` döndüren versiyon:
>
> ```python
> async def get_current_user_optional(
>     credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer(auto_error=False)),
>     db: Session = Depends(get_db),
> ) -> User | None:
>     if not credentials:
>         return None
>     try:
>         return await get_current_user(credentials, db)
>     except HTTPException:
>         return None
> ```

- [ ] **Step 4: `main.py`'e router'ı kaydet**

```python
from backend.routers.feedback import router as feedback_router
app.include_router(feedback_router)
```

- [ ] **Step 5: Testleri çalıştır**

```bash
cd backend
python -m pytest tests/test_feedback.py -v
```

Beklenen: Her iki test de PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/services/feedback_service.py backend/routers/feedback.py \
        backend/schemas.py backend/main.py backend/auth/dependencies.py \
        backend/tests/test_feedback.py
git commit -m "feat: add answer feedback (thumbs up/down) endpoint"
```

---

### Task 6: Feedback — Frontend

**Files:**
- Create: `frontend/src/components/FeedbackButonlari.jsx`
- Modify: `frontend/src/components/SohbetMesaji.jsx`
- Modify: `frontend/src/api/client.js`

- [ ] **Step 1: `client.js`'e feedback API fonksiyonu ekle**

```javascript
export async function feedbackGonder({ message_id, puan, guest_session_id }) {
  const { data } = await apiClient.post("/feedback", {
    message_id,
    puan,
    guest_session_id,
  });
  return data;
}
```

- [ ] **Step 2: `FeedbackButonlari.jsx` oluştur**

```jsx
// frontend/src/components/FeedbackButonlari.jsx
import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { feedbackGonder } from "../api/client";

export default function FeedbackButonlari({ messageId, guestSessionId }) {
  const [secim, setSecim] = useState(null); // 1, -1, veya null

  async function handleFeedback(puan) {
    if (secim === puan) return; // aynı oya tekrar tıklandı
    try {
      await feedbackGonder({
        message_id: messageId,
        puan,
        guest_session_id: guestSessionId,
      });
      setSecim(puan);
    } catch (err) {
      console.error("Feedback gönderilemedi:", err);
    }
  }

  return (
    <div className="flex gap-2 mt-2">
      <button
        onClick={() => handleFeedback(1)}
        title="Faydalı"
        className={`p-1 rounded transition-colors ${
          secim === 1
            ? "text-green-600 bg-green-50 dark:bg-green-900/20"
            : "text-gray-400 hover:text-green-600"
        }`}
      >
        <ThumbsUp size={14} />
      </button>
      <button
        onClick={() => handleFeedback(-1)}
        title="Faydalı Değil"
        className={`p-1 rounded transition-colors ${
          secim === -1
            ? "text-red-500 bg-red-50 dark:bg-red-900/20"
            : "text-gray-400 hover:text-red-500"
        }`}
      >
        <ThumbsDown size={14} />
      </button>
    </div>
  );
}
```

- [ ] **Step 3: `SohbetMesaji.jsx`'e feedback butonlarını entegre et**

`SohbetMesaji.jsx` içinde `role === "assistant"` koşullu render bloğunun sonuna ekle:

```jsx
import FeedbackButonlari from "./FeedbackButonlari";

// assistant mesajının altında:
{mesaj.role === "assistant" && mesaj.id && (
  <FeedbackButonlari
    messageId={mesaj.id}
    guestSessionId={guestSessionId}
  />
)}
```

> **Not:** Backend'den dönen mesaj ID'sinin frontend state'ine kaydedildiğinden emin ol. `useChat.js`'de `POST /ask` response'una `message_id` eklenmesi gerekebilir.

- [ ] **Step 4: Manuel test**

Frontend'i aç, bir soru sor, asistan cevabının altında 👍/👎 butonlarının göründüğünü ve tıklandığında renk değiştirdiğini doğrula.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/FeedbackButonlari.jsx \
        frontend/src/components/SohbetMesaji.jsx \
        frontend/src/api/client.js
git commit -m "feat: add thumbs up/down feedback buttons to chat messages"
```

---

## Chunk 3: PDF Doküman Yükleme & Analizi

---

### Task 7: PDF Backend — Yükleme & Metin Çıkarma

**Files:**
- Modify: `backend/requirements.txt`
- Create: `backend/services/document_service.py`
- Create: `backend/routers/documents.py`
- Modify: `backend/schemas.py`
- Modify: `backend/main.py`

- [ ] **Step 1: `requirements.txt`'e pypdf ekle**

```
pypdf>=4.0.0
python-multipart>=0.0.9
```

- [ ] **Step 2: Failing test yaz**

`backend/tests/test_document_service.py`:

```python
import pytest
from backend.services.document_service import pdf_metin_cikar

def test_pdf_metin_cikar_bos_bayt():
    """Geçersiz PDF için ValueError fırlatmalı."""
    with pytest.raises((ValueError, Exception)):
        pdf_metin_cikar(b"bu pdf degil")

def test_pdf_metin_cikar_minimum_pdf():
    """Minimal PDF bayt dizisi metin döndürmeli."""
    # Gerçek bir minimal PDF fixture'ı
    import io
    from pypdf import PdfWriter
    writer = PdfWriter()
    writer.add_blank_page(width=200, height=200)
    buf = io.BytesIO()
    writer.write(buf)
    sonuc = pdf_metin_cikar(buf.getvalue())
    assert isinstance(sonuc, str)
```

- [ ] **Step 3: Testi çalıştır — başarısız olduğunu doğrula**

```bash
cd backend
python -m pytest tests/test_document_service.py -v
```

- [ ] **Step 4: `backend/services/document_service.py` oluştur**

```python
"""PDF doküman işleme servisi."""
import io
from pypdf import PdfReader
from pypdf.errors import PdfReadError

MAX_PDF_BOYUT_MB = 10
MAX_METIN_KARAKTER = 15_000  # LLM context limiti için


def pdf_metin_cikar(pdf_baytlari: bytes) -> str:
    """PDF baytlarından metin çıkarır. Çok büyük PDF'ler kırpılır."""
    if len(pdf_baytlari) > MAX_PDF_BOYUT_MB * 1024 * 1024:
        raise ValueError(f"PDF boyutu {MAX_PDF_BOYUT_MB}MB'ı aşıyor")

    try:
        okuyucu = PdfReader(io.BytesIO(pdf_baytlari))
    except PdfReadError as e:
        raise ValueError(f"Geçersiz PDF dosyası: {e}") from e

    satirlar = []
    for sayfa in okuyucu.pages:
        metin = sayfa.extract_text()
        if metin:
            satirlar.append(metin)

    tam_metin = "\n".join(satirlar)
    if len(tam_metin) > MAX_METIN_KARAKTER:
        tam_metin = tam_metin[:MAX_METIN_KARAKTER] + "\n[... belge kesildi]"

    return tam_metin


def dokuman_analiz_sorusu_hazirla(belge_metni: str, kullanici_sorusu: str) -> str:
    """RAG pipeline'a gönderilecek zenginleştirilmiş sorguyu oluşturur."""
    return (
        f"Aşağıdaki belgeyi analiz et ve soruyu yanıtla:\n\n"
        f"BELGE:\n{belge_metni}\n\n"
        f"SORU: {kullanici_sorusu}"
    )
```

- [ ] **Step 5: Testleri çalıştır**

```bash
cd backend
python -m pytest tests/test_document_service.py -v
```

Beklenen: Her iki test PASS.

- [ ] **Step 6: `schemas.py`'e doküman şemaları ekle**

```python
class DokumanAnalizCevap(BaseModel):
    yanit: str
    belge_ozeti: str
    kaynaklar: list
    kategori: str = "Genel"
```

- [ ] **Step 7: `backend/routers/documents.py` oluştur**

```python
"""PDF yükleme ve analiz endpoint'leri."""
from fastapi import APIRouter, File, Form, UploadFile, HTTPException, Depends
from sqlalchemy.orm import Session
from backend.db.session import get_db
from backend.schemas import DokumanAnalizCevap
from backend.services.document_service import pdf_metin_cikar, dokuman_analiz_sorusu_hazirla
from backend.rag.pipeline import RAGPipeline

router = APIRouter(prefix="/documents", tags=["documents"])
pipeline = RAGPipeline()

IZIN_VERILEN_TIPLER = {"application/pdf", "application/x-pdf"}


@router.post("/analyze", response_model=DokumanAnalizCevap)
async def dokuman_analiz_et(
    dosya: UploadFile = File(...),
    soru: str = Form(default="Bu belgede dikkat etmem gereken önemli maddeler nelerdir?"),
    guest_session_id: str | None = Form(default=None),
    db: Session = Depends(get_db),
):
    """PDF yükle ve hukuki analiz yap."""
    if dosya.content_type not in IZIN_VERILEN_TIPLER and not dosya.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Sadece PDF dosyaları kabul edilir")

    pdf_baytlari = await dosya.read()

    try:
        belge_metni = pdf_metin_cikar(pdf_baytlari)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not belge_metni.strip():
        raise HTTPException(status_code=400, detail="PDF'den metin çıkarılamadı (taranmış görüntü olabilir)")

    # RAG pipeline'a zenginleştirilmiş sorgu gönder
    zengin_soru = dokuman_analiz_sorusu_hazirla(belge_metni, soru)
    sonuc = await pipeline.yanit_uret(zengin_soru, conversation_id=None)

    # Belge özeti (ilk 300 karakter)
    ozet = belge_metni[:300].replace("\n", " ").strip() + "..."

    return DokumanAnalizCevap(
        yanit=sonuc["yanit"],
        belge_ozeti=ozet,
        kaynaklar=sonuc.get("kaynaklar", []),
        kategori=sonuc.get("kategori", "Genel"),
    )
```

- [ ] **Step 8: `main.py`'e router'ı kaydet**

```python
from backend.routers.documents import router as documents_router
app.include_router(documents_router)
```

- [ ] **Step 9: Commit**

```bash
git add backend/services/document_service.py backend/routers/documents.py \
        backend/schemas.py backend/main.py backend/requirements.txt \
        backend/tests/test_document_service.py
git commit -m "feat: add PDF document upload and legal analysis endpoint"
```

---

### Task 8: PDF — Frontend Yükleme Arayüzü

**Files:**
- Create: `frontend/src/components/DokumanYukleme.jsx`
- Modify: `frontend/src/api/client.js`
- Modify: `frontend/src/pages/SohbetSayfasi.jsx`

- [ ] **Step 1: `client.js`'e doküman analiz fonksiyonu ekle**

```javascript
export async function dokumanAnalizEt(dosya, soru) {
  const form = new FormData();
  form.append("dosya", dosya);
  form.append("soru", soru || "Bu belgede dikkat etmem gereken önemli maddeler nelerdir?");
  const guestId = sessionStorage.getItem("guest_session_id");
  if (guestId) form.append("guest_session_id", guestId);

  const { data } = await apiClient.post("/documents/analyze", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}
```

- [ ] **Step 2: `DokumanYukleme.jsx` oluştur**

```jsx
// frontend/src/components/DokumanYukleme.jsx
import { useState, useRef } from "react";
import { Upload, FileText, X } from "lucide-react";
import { dokumanAnalizEt } from "../api/client";

export default function DokumanYukleme({ onSonuc, onYukleniyor }) {
  const [seciliDosya, setSeciliDosya] = useState(null);
  const [soru, setSoru] = useState("");
  const [hata, setHata] = useState(null);
  const inputRef = useRef();

  async function handleAnaliz() {
    if (!seciliDosya) return;
    setHata(null);
    onYukleniyor(true);
    try {
      const sonuc = await dokumanAnalizEt(seciliDosya, soru);
      onSonuc(sonuc);
    } catch (err) {
      setHata(err.response?.data?.detail || "Analiz başarısız oldu");
    } finally {
      onYukleniyor(false);
    }
  }

  return (
    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4">
      <div
        className="flex flex-col items-center gap-2 cursor-pointer"
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="text-gray-400" size={24} />
        <span className="text-sm text-gray-500">
          PDF sözleşme veya dilekçe yükle
        </span>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={e => setSeciliDosya(e.target.files[0])}
        />
      </div>

      {seciliDosya && (
        <div className="mt-3 space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <FileText size={16} className="text-blue-500" />
            <span className="truncate">{seciliDosya.name}</span>
            <button onClick={() => setSeciliDosya(null)}>
              <X size={14} className="text-gray-400 hover:text-red-500" />
            </button>
          </div>
          <input
            type="text"
            value={soru}
            onChange={e => setSoru(e.target.value)}
            placeholder="Belge hakkında sorunuz? (opsiyonel)"
            className="w-full text-sm border rounded-lg px-3 py-2 dark:bg-gray-800 dark:border-gray-600"
          />
          <button
            onClick={handleAnaliz}
            className="w-full bg-blue-600 text-white text-sm rounded-lg py-2 hover:bg-blue-700 transition-colors"
          >
            Belgeyi Analiz Et
          </button>
          {hata && <p className="text-red-500 text-xs">{hata}</p>}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: `SohbetSayfasi.jsx`'e yükleme komponenti entegre et**

Chat input alanının yanına bir "PDF Yükle" ikonu/butonu ekle. Tıklandığında `DokumanYukleme` panelini göster. Sonuç geldiğinde normal chat mesajı gibi ekrana bas:

```jsx
import DokumanYukleme from "../components/DokumanYukleme";

// State:
const [dokumanPaneliAcik, setDokumanPaneliAcik] = useState(false);

// Input alanı yanına:
<button
  onClick={() => setDokumanPaneliAcik(!dokumanPaneliAcik)}
  title="PDF Yükle"
  className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
>
  <Upload size={20} />
</button>

// Koşullu panel:
{dokumanPaneliAcik && (
  <DokumanYukleme
    onSonuc={(sonuc) => {
      // Sonucu chat mesajı olarak ekle
      mesajEkle({ role: "assistant", content: sonuc.yanit, kaynaklar: sonuc.kaynaklar });
      setDokumanPaneliAcik(false);
    }}
    onYukleniyor={setYukleniyor}
  />
)}
```

- [ ] **Step 4: Manuel test**

Frontend'i başlat, PDF ikonu ile bir sözleşme PDF'i yükle, analizin chat alanında göründüğünü doğrula.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/DokumanYukleme.jsx \
        frontend/src/pages/SohbetSayfasi.jsx \
        frontend/src/api/client.js
git commit -m "feat: add PDF document upload UI to chat interface"
```

---

## Chunk 4: Hukuki Belge Taslağı

---

### Task 9: Taslak Generator — Backend

**Files:**
- Modify: `backend/requirements.txt`
- Create: `backend/templates/kira_sozlesmesi.py`
- Create: `backend/templates/is_akdi_feshi.py`
- Create: `backend/templates/vekaletname.py`
- Create: `backend/services/template_service.py`
- Create: `backend/routers/templates.py`
- Modify: `backend/schemas.py`
- Modify: `backend/main.py`

- [ ] **Step 1: `requirements.txt`'e reportlab ekle**

```
reportlab>=4.0.0
```

- [ ] **Step 2: Failing test yaz**

`backend/tests/test_template_service.py`:

```python
import pytest
from backend.services.template_service import taslak_uret, SABLON_LISTESI

def test_sablon_listesi_dolу():
    assert len(SABLON_LISTESI) >= 3

def test_kira_sozlesmesi_uret():
    pdf_baytlari = taslak_uret("kira_sozlesmesi", {
        "kiralayan_ad": "Ahmet Yılmaz",
        "kiralayan_tc": "12345678901",
        "kiracı_ad": "Mehmet Kaya",
        "kiracı_tc": "98765432100",
        "adres": "Atatürk Cad. No:1 Kadıköy/İstanbul",
        "kira_bedeli": "5000",
        "baslangic_tarihi": "01.04.2026",
        "sure_ay": "12",
    })
    assert len(pdf_baytlari) > 0
    # PDF header kontrolü
    assert pdf_baytlari[:4] == b"%PDF"

def test_gecersiz_sablon():
    with pytest.raises(ValueError):
        taslak_uret("gecersiz_sablon", {})
```

- [ ] **Step 3: Testi çalıştır — başarısız olduğunu doğrula**

```bash
cd backend
python -m pytest tests/test_template_service.py -v
```

- [ ] **Step 4: `backend/templates/kira_sozlesmesi.py` oluştur**

```python
"""Kira sözleşmesi şablon tanımı."""

SABLON_ADI = "kira_sozlesmesi"
SABLON_ETIKET = "Kira Sözleşmesi"
ALANLAR = [
    {"id": "kiralayan_ad", "etiket": "Kiraya Veren Ad Soyad", "zorunlu": True},
    {"id": "kiralayan_tc", "etiket": "Kiraya Veren TC No", "zorunlu": True},
    {"id": "kiracı_ad", "etiket": "Kiracı Ad Soyad", "zorunlu": True},
    {"id": "kiracı_tc", "etiket": "Kiracı TC No", "zorunlu": True},
    {"id": "adres", "etiket": "Kiralık Taşınmazın Adresi", "zorunlu": True},
    {"id": "kira_bedeli", "etiket": "Aylık Kira Bedeli (TL)", "zorunlu": True},
    {"id": "baslangic_tarihi", "etiket": "Başlangıç Tarihi (GG.AA.YYYY)", "zorunlu": True},
    {"id": "sure_ay", "etiket": "Süre (Ay)", "zorunlu": False, "varsayilan": "12"},
]


def icerik_olustur(veri: dict) -> list[tuple[str, str]]:
    """(başlık, içerik) çiftleri listesi döndür."""
    return [
        ("KİRA SÖZLEŞMESİ", ""),
        ("1. TARAFLAR", (
            f"Kiraya Veren: {veri['kiralayan_ad']} (TC: {veri['kiralayan_tc']})\n"
            f"Kiracı: {veri['kiracı_ad']} (TC: {veri['kiracı_tc']})"
        )),
        ("2. KİRALANAN TAŞINMAZ", veri["adres"]),
        ("3. KİRA SÜRESİ VE BEDELİ", (
            f"Kira süresi {veri.get('sure_ay', '12')} ay olup "
            f"{veri['baslangic_tarihi']} tarihinde başlar.\n"
            f"Aylık kira bedeli {veri['kira_bedeli']} TL'dir."
        )),
        ("4. GENEL HÜKÜMLER", (
            "Bu sözleşme 6098 sayılı Türk Borçlar Kanunu ve 6570 sayılı Kira Kanunu "
            "hükümleri çerçevesinde düzenlenmiştir. Taraflar sözleşme hükümlerine "
            "uymakla yükümlüdür."
        )),
        ("İMZALAR", "Kiraya Veren: _______________     Kiracı: _______________"),
    ]
```

- [ ] **Step 5: `backend/templates/is_akdi_feshi.py` oluştur**

```python
SABLON_ADI = "is_akdi_feshi"
SABLON_ETIKET = "İş Akdi Feshi İhtarnamesi"
ALANLAR = [
    {"id": "gonderen_ad", "etiket": "Gönderen Ad Soyad", "zorunlu": True},
    {"id": "gonderen_adres", "etiket": "Gönderen Adresi", "zorunlu": True},
    {"id": "alici_sirket", "etiket": "Alıcı Şirket Adı", "zorunlu": True},
    {"id": "alici_adres", "etiket": "Alıcı Adresi", "zorunlu": True},
    {"id": "is_baslangic", "etiket": "İşe Başlama Tarihi", "zorunlu": True},
    {"id": "fesih_nedeni", "etiket": "Fesih Nedeni", "zorunlu": True},
    {"id": "ihbar_suresi_gun", "etiket": "İhbar Süresi (Gün)", "zorunlu": False, "varsayilan": "28"},
]


def icerik_olustur(veri: dict) -> list[tuple[str, str]]:
    return [
        ("İŞ AKDİ FESHİ İHTARNAMESİ", ""),
        ("TARAFLAR", (
            f"Gönderen: {veri['gonderen_ad']}\nAdres: {veri['gonderen_adres']}\n\n"
            f"Alıcı: {veri['alici_sirket']}\nAdres: {veri['alici_adres']}"
        )),
        ("KONU", (
            f"{veri['is_baslangic']} tarihinden bu yana çalışmaktayım. "
            f"Aşağıda belirtilen nedenle iş akdimi feshetmek zorunda kaldım."
        )),
        ("FESİH NEDENİ", veri["fesih_nedeni"]),
        ("TALEP", (
            f"{veri.get('ihbar_suresi_gun', '28')} günlük ihbar süresi dikkate alınarak "
            "kıdem ve ihbar tazminatı ile diğer yasal haklarımın ödenmesini talep ederim."
        )),
        ("HUKUKİ DAYANAK", "4857 sayılı İş Kanunu md. 17, 24, 32, 41"),
        ("İMZA", f"{veri['gonderen_ad']}\nTarih: _______________"),
    ]
```

- [ ] **Step 6: `backend/templates/vekaletname.py` oluştur**

```python
SABLON_ADI = "vekaletname"
SABLON_ETIKET = "Vekaletname"
ALANLAR = [
    {"id": "vekalet_veren_ad", "etiket": "Vekâlet Veren Ad Soyad", "zorunlu": True},
    {"id": "vekalet_veren_tc", "etiket": "Vekâlet Veren TC No", "zorunlu": True},
    {"id": "vekalet_alan_ad", "etiket": "Vekil Ad Soyad", "zorunlu": True},
    {"id": "vekalet_alan_tc", "etiket": "Vekil TC No", "zorunlu": True},
    {"id": "vekalet_konusu", "etiket": "Vekâlet Konusu", "zorunlu": True},
    {"id": "gecerlilik_tarihi", "etiket": "Geçerlilik Tarihi", "zorunlu": False, "varsayilan": "Belirtilmemiş"},
]


def icerik_olustur(veri: dict) -> list[tuple[str, str]]:
    return [
        ("VEKALETNAME", ""),
        ("VEKÂLETİ VEREN", f"{veri['vekalet_veren_ad']} (TC: {veri['vekalet_veren_tc']})"),
        ("VEKİL", f"{veri['vekalet_alan_ad']} (TC: {veri['vekalet_alan_tc']})"),
        ("VEKÂLETİN KONUSU", veri["vekalet_konusu"]),
        ("GEÇERLİLİK SÜRESİ", veri.get("gecerlilik_tarihi", "Belirtilmemiş")),
        ("GENEL HÜKÜMLER", (
            "Vekil, işbu vekaletname kapsamında vekâlet verenin menfaatlerini "
            "gözetmek ve dürüstlük kurallarına uygun hareket etmekle yükümlüdür."
        )),
        ("İMZALAR", "Vekâlet Veren: _______________\nTarih: _______________"),
    ]
```

- [ ] **Step 7: `backend/services/template_service.py` oluştur**

```python
"""Hukuki belge taslağı PDF üretim servisi."""
import io
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

from backend.templates import kira_sozlesmesi, is_akdi_feshi, vekaletname

SABLONLAR = {
    m.SABLON_ADI: m
    for m in [kira_sozlesmesi, is_akdi_feshi, vekaletname]
}

SABLON_LISTESI = [
    {"id": m.SABLON_ADI, "etiket": m.SABLON_ETIKET, "alanlar": m.ALANLAR}
    for m in [kira_sozlesmesi, is_akdi_feshi, vekaletname]
]


def taslak_uret(sablon_id: str, veri: dict) -> bytes:
    """Belirtilen şablona göre PDF üret ve baytlar olarak döndür."""
    if sablon_id not in SABLONLAR:
        raise ValueError(f"Bilinmeyen şablon: {sablon_id}")

    modul = SABLONLAR[sablon_id]
    icerik = modul.icerik_olustur(veri)

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=2.5 * cm, rightMargin=2.5 * cm,
        topMargin=2 * cm, bottomMargin=2 * cm,
    )

    styles = getSampleStyleSheet()
    baslik_stili = ParagraphStyle(
        "Baslik", parent=styles["Heading1"],
        alignment=TA_CENTER, fontSize=14, spaceAfter=12,
    )
    alt_baslik_stili = ParagraphStyle(
        "AltBaslik", parent=styles["Heading2"],
        fontSize=11, spaceBefore=12, spaceAfter=6,
    )
    icerik_stili = ParagraphStyle(
        "Icerik", parent=styles["Normal"],
        fontSize=10, leading=14,
    )

    elemanlar = []
    for baslik, metin in icerik:
        if not metin:  # Ana başlık
            elemanlar.append(Paragraph(baslik, baslik_stili))
        else:
            elemanlar.append(Paragraph(baslik, alt_baslik_stili))
            elemanlar.append(Paragraph(metin.replace("\n", "<br/>"), icerik_stili))
        elemanlar.append(Spacer(1, 0.3 * cm))

    doc.build(elemanlar)
    return buf.getvalue()
```

- [ ] **Step 8: `backend/templates/__init__.py` oluştur**

```python
# Boş init dosyası
```

- [ ] **Step 9: Testleri çalıştır**

```bash
cd backend
python -m pytest tests/test_template_service.py -v
```

Beklenen: 3 test PASS.

- [ ] **Step 10: `backend/routers/templates.py` oluştur**

```python
"""Hukuki belge taslağı endpoint'leri."""
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from backend.services.template_service import taslak_uret, SABLON_LISTESI
from backend.schemas import TaslakIstek

router = APIRouter(prefix="/templates", tags=["templates"])


@router.get("")
async def sablonlari_listele():
    """Mevcut belge şablonlarını listele."""
    return {"sablonlar": SABLON_LISTESI}


@router.post("/{sablon_id}/generate")
async def taslak_olustur(sablon_id: str, veri: TaslakIstek):
    """Formdan alınan verilerle PDF taslağı oluştur."""
    try:
        pdf_baytlari = taslak_uret(sablon_id, veri.alanlar)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF oluşturulamadı: {e}")

    return Response(
        content=pdf_baytlari,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={sablon_id}.pdf"},
    )
```

- [ ] **Step 11: `schemas.py`'e taslak şeması ekle**

```python
class TaslakIstek(BaseModel):
    alanlar: dict[str, str]
```

- [ ] **Step 12: `main.py`'e router'ı kaydet**

```python
from backend.routers.templates import router as templates_router
app.include_router(templates_router)
```

- [ ] **Step 13: Commit**

```bash
git add backend/templates/ backend/services/template_service.py \
        backend/routers/templates.py backend/schemas.py backend/main.py \
        backend/requirements.txt backend/tests/test_template_service.py
git commit -m "feat: add legal document template PDF generator (3 templates)"
```

---

### Task 10: Taslak Generator — Frontend

**Files:**
- Create: `frontend/src/components/BelgeTaslagi.jsx`
- Modify: `frontend/src/api/client.js`
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: `client.js`'e taslak API fonksiyonları ekle**

```javascript
export async function sablonlariGetir() {
  const { data } = await apiClient.get("/templates");
  return data.sablonlar;
}

export async function taslakOlustur(sablonId, alanlar) {
  const { data } = await apiClient.post(
    `/templates/${sablonId}/generate`,
    { alanlar },
    { responseType: "blob" }
  );
  return data; // Blob
}
```

- [ ] **Step 2: `BelgeTaslagi.jsx` oluştur**

```jsx
// frontend/src/components/BelgeTaslagi.jsx
import { useState, useEffect } from "react";
import { FileText, Download } from "lucide-react";
import { sablonlariGetir, taslakOlustur } from "../api/client";

export default function BelgeTaslagi({ onKapat }) {
  const [sablonlar, setSablonlar] = useState([]);
  const [seciliSablon, setSeciliSablon] = useState(null);
  const [formVeri, setFormVeri] = useState({});
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState(null);

  useEffect(() => {
    sablonlariGetir().then(setSablonlar).catch(console.error);
  }, []);

  function handleSablonSec(sablon) {
    setSeciliSablon(sablon);
    // Varsayılan değerleri doldur
    const varsayilanlar = {};
    sablon.alanlar.forEach(alan => {
      if (alan.varsayilan) varsayilanlar[alan.id] = alan.varsayilan;
    });
    setFormVeri(varsayilanlar);
    setHata(null);
  }

  async function handleIndir() {
    setYukleniyor(true);
    setHata(null);
    try {
      const blob = await taslakOlustur(seciliSablon.id, formVeri);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${seciliSablon.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setHata("PDF oluşturulamadı. Lütfen zorunlu alanları doldurun.");
    } finally {
      setYukleniyor(false);
    }
  }

  if (!seciliSablon) {
    return (
      <div className="p-4 space-y-3">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100">
          Hukuki Belge Taslağı
        </h3>
        <p className="text-sm text-gray-500">Bir şablon seçin:</p>
        {sablonlar.map(s => (
          <button
            key={s.id}
            onClick={() => handleSablonSec(s)}
            className="w-full flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
          >
            <FileText size={18} className="text-blue-500" />
            <span className="text-sm font-medium">{s.etiket}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{seciliSablon.etiket}</h3>
        <button
          onClick={() => setSeciliSablon(null)}
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          ← Geri
        </button>
      </div>

      {seciliSablon.alanlar.map(alan => (
        <div key={alan.id} className="space-y-1">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
            {alan.etiket} {alan.zorunlu && <span className="text-red-500">*</span>}
          </label>
          <input
            type="text"
            value={formVeri[alan.id] || ""}
            onChange={e => setFormVeri(prev => ({ ...prev, [alan.id]: e.target.value }))}
            className="w-full text-sm border rounded-lg px-3 py-2 dark:bg-gray-800 dark:border-gray-600"
            placeholder={alan.etiket}
          />
        </div>
      ))}

      {hata && <p className="text-red-500 text-xs">{hata}</p>}

      <button
        onClick={handleIndir}
        disabled={yukleniyor}
        className="w-full flex items-center justify-center gap-2 bg-green-600 text-white rounded-lg py-2 hover:bg-green-700 disabled:opacity-50 transition-colors"
      >
        <Download size={16} />
        {yukleniyor ? "Oluşturuluyor..." : "PDF İndir"}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: `App.jsx`'e taslak butonunu ekle**

Header veya sidebar'a "Belge Taslağı" butonu ve koşullu panel ekle. Mevcut header butonlarının yanına:

```jsx
import BelgeTaslagi from "./components/BelgeTaslagi";

// State:
const [taslakPaneliAcik, setTaslakPaneliAcik] = useState(false);

// Buton (header'a):
<button
  onClick={() => setTaslakPaneliAcik(!taslakPaneliAcik)}
  title="Belge Taslağı Oluştur"
  className="p-2 text-gray-500 hover:text-green-600 transition-colors"
>
  <FileText size={20} />
</button>

// Modal/panel:
{taslakPaneliAcik && (
  <div className="absolute right-4 top-14 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 max-h-[80vh] overflow-y-auto">
    <BelgeTaslagi onKapat={() => setTaslakPaneliAcik(false)} />
  </div>
)}
```

- [ ] **Step 4: Manuel test**

Frontend'i başlat, "Belge Taslağı" butonuna tıkla, kira sözleşmesi şablonunu seç, alanları doldur, PDF'i indir ve içeriğini doğrula.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/BelgeTaslagi.jsx \
        frontend/src/api/client.js frontend/src/App.jsx
git commit -m "feat: add legal document template UI with PDF download"
```

---

## Chunk 5: Admin Analytics Dashboard

---

### Task 11: Admin Analytics — Backend

**Files:**
- Create: `backend/routers/admin.py`
- Modify: `backend/schemas.py`
- Modify: `backend/main.py`
- Modify: `backend/auth/dependencies.py`

- [ ] **Step 1: `schemas.py`'e analytics şemaları ekle**

```python
class KategoriIstatistik(BaseModel):
    kategori: str
    soru_sayisi: int

class GunlukKullanici(BaseModel):
    tarih: str
    yeni_kullanici: int

class AnalyticsDashboard(BaseModel):
    toplam_kullanici: int
    toplam_soru: int
    bugun_soru: int
    kategori_dagilimi: list[KategoriIstatistik]
    gunluk_kullanici: list[GunlukKullanici]
    en_cok_sorulan: list[str]
```

- [ ] **Step 2: `backend/routers/admin.py` oluştur**

```python
"""Admin analytics endpoint'leri — sadece admin rolüne açık."""
from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date
from backend.db.session import get_db
from backend.models.user import User
from backend.models.chat_history import ChatHistory
from backend.models.enums import UserRole, MessageRole
from backend.schemas import AnalyticsDashboard, KategoriIstatistik, GunlukKullanici
from backend.auth.dependencies import get_current_user

router = APIRouter(prefix="/admin", tags=["admin"])


def admin_gerektir(mevcut_kullanici: User = Depends(get_current_user)):
    if mevcut_kullanici.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Admin yetkisi gerekli")
    return mevcut_kullanici


@router.get("/analytics", response_model=AnalyticsDashboard)
async def analytics_getir(
    db: Session = Depends(get_db),
    _admin=Depends(admin_gerektir),
):
    """Admin analytics verisini döndür."""
    bugun = date.today()

    # Toplam kullanıcı
    toplam_kullanici = db.query(func.count(User.id)).scalar()

    # Toplam soru (user role = user demek soru demek)
    toplam_soru = (
        db.query(func.count(ChatHistory.id))
        .filter(ChatHistory.role == MessageRole.user)
        .scalar()
    )

    # Bugün sorulan sorular
    bugun_soru = (
        db.query(func.count(ChatHistory.id))
        .filter(
            ChatHistory.role == MessageRole.user,
            cast(ChatHistory.created_at, Date) == bugun,
        )
        .scalar()
    )

    # Kategori dağılımı
    kategori_sorgu = (
        db.query(ChatHistory.category, func.count(ChatHistory.id).label("sayi"))
        .filter(ChatHistory.role == MessageRole.user, ChatHistory.category.isnot(None))
        .group_by(ChatHistory.category)
        .order_by(func.count(ChatHistory.id).desc())
        .all()
    )
    kategori_dagilimi = [
        KategoriIstatistik(kategori=k or "Genel", soru_sayisi=s)
        for k, s in kategori_sorgu
    ]

    # Son 7 gün yeni kullanıcı
    gunluk_kullanici = []
    for i in range(6, -1, -1):
        gun = bugun - timedelta(days=i)
        sayi = (
            db.query(func.count(User.id))
            .filter(cast(User.created_at, Date) == gun)
            .scalar()
        )
        gunluk_kullanici.append(GunlukKullanici(tarih=gun.isoformat(), yeni_kullanici=sayi))

    # En çok sorulan (ilk 5 soru içeriği — son 100 sorudan benzersiz)
    son_sorular = (
        db.query(ChatHistory.content)
        .filter(ChatHistory.role == MessageRole.user)
        .order_by(ChatHistory.created_at.desc())
        .limit(100)
        .all()
    )
    # Basit frekans analizi
    from collections import Counter
    frekans = Counter(s.content for s in son_sorular)
    en_cok = [soru for soru, _ in frekans.most_common(5)]

    return AnalyticsDashboard(
        toplam_kullanici=toplam_kullanici,
        toplam_soru=toplam_soru,
        bugun_soru=bugun_soru,
        kategori_dagilimi=kategori_dagilimi,
        gunluk_kullanici=gunluk_kullanici,
        en_cok_sorulan=en_cok,
    )
```

- [ ] **Step 3: `main.py`'e router'ı kaydet**

```python
from backend.routers.admin import router as admin_router
app.include_router(admin_router)
```

- [ ] **Step 4: Test**

```bash
cd backend
python -m pytest tests/ -v
```

- [ ] **Step 5: Commit**

```bash
git add backend/routers/admin.py backend/schemas.py backend/main.py
git commit -m "feat: add admin analytics dashboard API endpoint"
```

---

### Task 12: Admin Analytics — Frontend

**Files:**
- Create: `frontend/src/pages/AdminSayfasi.jsx`
- Modify: `frontend/src/api/client.js`
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: `client.js`'e analytics API fonksiyonu ekle**

```javascript
export async function analyticsGetir() {
  const { data } = await apiClient.get("/admin/analytics");
  return data;
}
```

- [ ] **Step 2: `frontend/src/pages/AdminSayfasi.jsx` oluştur**

```jsx
// frontend/src/pages/AdminSayfasi.jsx
import { useState, useEffect } from "react";
import { analyticsGetir } from "../api/client";
import { Users, MessageSquare, TrendingUp, BarChart2 } from "lucide-react";

function MetrikKart({ baslik, deger, ikon: Ikon, renk = "blue" }) {
  const renkMap = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20",
    green: "bg-green-50 text-green-600 dark:bg-green-900/20",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-900/20",
  };
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${renkMap[renk]}`}>
        <Ikon size={20} />
      </div>
      <div>
        <p className="text-xs text-gray-500">{baslik}</p>
        <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{deger}</p>
      </div>
    </div>
  );
}

export default function AdminSayfasi() {
  const [veri, setVeri] = useState(null);
  const [hata, setHata] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);

  useEffect(() => {
    analyticsGetir()
      .then(setVeri)
      .catch(err => setHata(err.response?.data?.detail || "Yüklenemedi"))
      .finally(() => setYukleniyor(false));
  }, []);

  if (yukleniyor) return <div className="p-8 text-center">Yükleniyor...</div>;
  if (hata) return <div className="p-8 text-center text-red-500">{hata}</div>;

  const maxKategori = Math.max(...(veri.kategori_dagilimi.map(k => k.soru_sayisi) || [1]));

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
        Admin Dashboard
      </h1>

      {/* Metrik Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetrikKart baslik="Toplam Kullanıcı" deger={veri.toplam_kullanici} ikon={Users} renk="blue" />
        <MetrikKart baslik="Toplam Soru" deger={veri.toplam_soru} ikon={MessageSquare} renk="green" />
        <MetrikKart baslik="Bugün Soru" deger={veri.bugun_soru} ikon={TrendingUp} renk="purple" />
      </div>

      {/* Kategori Dağılımı */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <BarChart2 size={18} className="text-blue-500" />
          Hukuk Alanı Dağılımı
        </h2>
        <div className="space-y-3">
          {veri.kategori_dagilimi.map(k => (
            <div key={k.kategori} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300">{k.kategori}</span>
                <span className="font-medium">{k.soru_sayisi} soru</span>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${(k.soru_sayisi / maxKategori) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Son 7 Gün Kullanıcı */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <h2 className="font-semibold mb-4">Son 7 Gün — Yeni Kullanıcı</h2>
        <div className="flex items-end gap-2 h-24">
          {veri.gunluk_kullanici.map(g => {
            const maxVal = Math.max(...veri.gunluk_kullanici.map(x => x.yeni_kullanici), 1);
            const yukseklik = Math.max((g.yeni_kullanici / maxVal) * 100, 4);
            return (
              <div key={g.tarih} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-gray-500">{g.yeni_kullanici}</span>
                <div
                  className="w-full bg-blue-400 rounded-t"
                  style={{ height: `${yukseklik}%` }}
                />
                <span className="text-xs text-gray-400">{g.tarih.slice(5)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* En Çok Sorulan */}
      {veri.en_cok_sorulan.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold mb-3">En Çok Sorulan Sorular</h2>
          <ol className="space-y-2">
            {veri.en_cok_sorulan.map((soru, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="text-blue-500 font-bold w-4">{i + 1}.</span>
                <span className="text-gray-700 dark:text-gray-300 line-clamp-2">{soru}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: `App.jsx`'e admin route ekle**

```jsx
import AdminSayfasi from "./pages/AdminSayfasi";
import { useAuth } from "./context/AuthContext";

// AppIcerik içinde, kullanıcı admin ise header'a link ekle:
const { kullanici } = useAuth();
// ...
{kullanici?.role === "admin" && (
  <button onClick={() => setAktifSayfa("admin")} className="...">
    Dashboard
  </button>
)}

// Sayfa render:
{aktifSayfa === "admin" ? <AdminSayfasi /> : <SohbetSayfasi />}
```

- [ ] **Step 4: Manuel test**

Admin kullanıcıyla giriş yap, dashboard linkinin göründüğünü ve verilerin doğru yüklendiğini doğrula.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/AdminSayfasi.jsx \
        frontend/src/api/client.js frontend/src/App.jsx
git commit -m "feat: add admin analytics dashboard page"
```

---

## Chunk 6: Çok Dilli Destek (TR/EN)

---

### Task 13: i18n Altyapısı — Frontend

**Files:**
- Modify: `frontend/package.json` (i18next eklentisi)
- Create: `frontend/src/locales/tr.json`
- Create: `frontend/src/locales/en.json`
- Create: `frontend/src/context/DilContext.jsx`
- Create: `frontend/src/components/DilSecici.jsx`
- Modify: `frontend/src/main.jsx`

- [ ] **Step 1: i18next yükle**

```bash
cd frontend
npm install i18next react-i18next
```

- [ ] **Step 2: `frontend/src/locales/tr.json` oluştur**

```json
{
  "anaSayfa": {
    "baslik": "Hak-Bul",
    "altBaslik": "Hukuki Asistanınız",
    "sorPlaceholder": "Hukuki sorunuzu sorun...",
    "gonder": "Gönder",
    "ornekSorular": "Örnek Sorular",
    "yeniSohbet": "Yeni Sohbet",
    "gecmis": "Sohbet Geçmişi"
  },
  "auth": {
    "girisYap": "Giriş Yap",
    "kayitOl": "Kayıt Ol",
    "cikisYap": "Çıkış Yap",
    "email": "E-posta",
    "sifre": "Şifre",
    "girisBasarili": "Giriş başarılı"
  },
  "mesaj": {
    "yukleniyor": "Yanıt hazırlanıyor...",
    "hata": "Bir hata oluştu. Lütfen tekrar deneyin.",
    "kaynaklar": "Kaynaklar",
    "kategori": "Kategori"
  },
  "dokuman": {
    "yukle": "PDF Yükle",
    "analiz": "Belgeyi Analiz Et",
    "taslak": "Belge Taslağı"
  },
  "uyari": {
    "baslik": "Hukuki Uyarı",
    "metin": "Bu uygulama yalnızca bilgilendirme amaçlıdır. Profesyonel hukuki tavsiye yerine geçmez.",
    "kabul": "Anladım, Devam Et"
  }
}
```

- [ ] **Step 3: `frontend/src/locales/en.json` oluştur**

```json
{
  "anaSayfa": {
    "baslik": "Hak-Bul",
    "altBaslik": "Your Legal Assistant",
    "sorPlaceholder": "Ask your legal question...",
    "gonder": "Send",
    "ornekSorular": "Example Questions",
    "yeniSohbet": "New Chat",
    "gecmis": "Chat History"
  },
  "auth": {
    "girisYap": "Sign In",
    "kayitOl": "Sign Up",
    "cikisYap": "Sign Out",
    "email": "Email",
    "sifre": "Password",
    "girisBasarili": "Login successful"
  },
  "mesaj": {
    "yukleniyor": "Preparing answer...",
    "hata": "An error occurred. Please try again.",
    "kaynaklar": "Sources",
    "kategori": "Category"
  },
  "dokuman": {
    "yukle": "Upload PDF",
    "analiz": "Analyze Document",
    "taslak": "Document Template"
  },
  "uyari": {
    "baslik": "Legal Disclaimer",
    "metin": "This application is for informational purposes only. It does not replace professional legal advice.",
    "kabul": "I Understand, Continue"
  }
}
```

- [ ] **Step 4: `frontend/src/context/DilContext.jsx` oluştur**

```jsx
import { createContext, useContext, useState, useEffect } from "react";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import tr from "../locales/tr.json";
import en from "../locales/en.json";

i18n.use(initReactI18next).init({
  resources: {
    tr: { translation: tr },
    en: { translation: en },
  },
  lng: localStorage.getItem("dil") || "tr",
  fallbackLng: "tr",
  interpolation: { escapeValue: false },
});

const DilContext = createContext(null);

export function DilProvider({ children }) {
  const [dil, setDil] = useState(i18n.language);

  function dilDegistir(yeniDil) {
    i18n.changeLanguage(yeniDil);
    localStorage.setItem("dil", yeniDil);
    setDil(yeniDil);
  }

  return (
    <DilContext.Provider value={{ dil, dilDegistir }}>
      {children}
    </DilContext.Provider>
  );
}

export function useDil() {
  return useContext(DilContext);
}
```

- [ ] **Step 5: `main.jsx`'e DilProvider ekle**

```jsx
import { DilProvider } from "./context/DilContext";

// Mevcut provider sarmalama hiyerarşisine DilProvider'ı ekle:
<DilProvider>
  <TemaProvider>
    <AuthProvider>
      ...
    </AuthProvider>
  </TemaProvider>
</DilProvider>
```

- [ ] **Step 6: `DilSecici.jsx` oluştur**

```jsx
// frontend/src/components/DilSecici.jsx
import { useDil } from "../context/DilContext";
import { Globe } from "lucide-react";

export default function DilSecici() {
  const { dil, dilDegistir } = useDil();

  return (
    <div className="flex items-center gap-1">
      <Globe size={14} className="text-gray-400" />
      <select
        value={dil}
        onChange={e => dilDegistir(e.target.value)}
        className="text-xs bg-transparent border-none text-gray-500 cursor-pointer focus:outline-none"
      >
        <option value="tr">TR</option>
        <option value="en">EN</option>
      </select>
    </div>
  );
}
```

- [ ] **Step 7: Arayüzdeki statik metinleri `t()` ile değiştir**

`SohbetSayfasi.jsx`, `HukukiUyariModal.jsx`, `AuthModal.jsx` ve diğer bileşenlerde:

```jsx
import { useTranslation } from "react-i18next";

// Bileşen içinde:
const { t } = useTranslation();

// Statik metin yerine:
// "Giriş Yap" → {t("auth.girisYap")}
// "PDF Yükle" → {t("dokuman.yukle")}
// vb.
```

> **Not:** Tüm metinleri tek seferde değiştirmeye çalışma — önce `HukukiUyariModal`, `AuthModal` gibi izole bileşenlerden başla, sonra ana sayfa.

- [ ] **Step 8: `DilSecici`'yi header'a ekle**

`App.jsx` veya `SohbetSayfasi.jsx` içindeki header bölümüne:

```jsx
import DilSecici from "./components/DilSecici";
// Header'da tema butonu yanına:
<DilSecici />
```

- [ ] **Step 9: Backend dil parametresi (opsiyonel)**

Eğer cevapların da dil tercihine göre üretilmesi isteniyorsa, `POST /ask` isteğine `dil` parametresi ekle:

`backend/schemas.py`:
```python
class SoruIstek(BaseModel):
    soru: str
    conversation_id: UUID | None = None
    guest_session_id: str | None = None
    dil: str = "tr"  # "tr" veya "en"
```

`backend/rag/generator.py` içinde system prompt'a dil yönlendirmesi ekle:
```python
dil_talimat = "Yanıtını Türkçe ver." if dil == "tr" else "Answer in English."
system_prompt = f"{mevcut_system_prompt}\n{dil_talimat}"
```

- [ ] **Step 10: Manuel test**

Frontend'i başlat, dil seçiciyi EN'e çevir, tüm arayüz metinlerinin İngilizce göründüğünü doğrula. TR'ye döndüğünde Türkçeye döndüğünü doğrula.

- [ ] **Step 11: Commit**

```bash
git add frontend/src/locales/ frontend/src/context/DilContext.jsx \
        frontend/src/components/DilSecici.jsx frontend/src/main.jsx \
        frontend/src/App.jsx frontend/src/pages/SohbetSayfasi.jsx \
        frontend/src/components/HukukiUyariModal.jsx \
        frontend/src/components/AuthModal.jsx
git commit -m "feat: add TR/EN multilingual support with i18next"
```

---

## Özet — Implementasyon Sırası

| # | Özellik | Etki | Efor | Öncelik |
|---|---------|------|------|---------|
| 1 | Embedding Model (multilingual-e5-base) | Temel iyileştirme | Düşük | Yüksek |
| 2 | Soru Kategorilendirme | Pipeline + UI | Orta | Yüksek |
| 3 | Cevap Puanlama (👍/👎) | Feedback loop | Orta | Yüksek |
| 4 | PDF Doküman Analizi | Yeni özellik | Yüksek | Yüksek |
| 5 | Hukuki Belge Taslağı | Yeni özellik | Yüksek | Yüksek |
| 6 | Admin Dashboard | Analytics | Orta | Orta |
| 7 | Çok Dilli Destek | i18n | Orta | Orta |

**Jüri için önerilen sunum sırası:** 4 → 5 → 2 → 3 → 6 → 7 → 1 (etkiden düşüğe)
