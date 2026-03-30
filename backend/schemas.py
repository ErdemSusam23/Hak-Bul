import re

from pydantic import BaseModel, Field, field_validator


class AskRequest(BaseModel):
    soru: str = Field(..., min_length=10, max_length=1000)
    max_kaynak: int = Field(default=5, ge=1, le=10)
    language: str = Field(default="tr", pattern="^(tr|en)$")
    conversation_id: str | None = Field(default=None, min_length=36, max_length=36)
    guest_session_id: str | None = Field(default=None, min_length=36, max_length=36)


class KaynakItem(BaseModel):
    kaynak_turu: str
    baslik: str
    metin_ozet: str
    metin: str | None = None
    skor: float
    url: str | None = None


class AskResponse(BaseModel):
    yanit: str
    kaynaklar: list[KaynakItem]
    conversation_id: str
    guest_session_id: str | None = None
    kategori: str = "Genel Hukuk"
    message_id: str | None = None
    uyari: str = "Bu yanit bilgi amaclidir ve hukuki tavsiye niteligi tasimaz."


class SearchResponse(BaseModel):
    sonuclar: list[KaynakItem]
    toplam: int


class HealthResponse(BaseModel):
    status: str
    qdrant: str
    groq: str
    version: str = "1.0.0"


class RegisterRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=8, max_length=128)


class RefreshRequest(BaseModel):
    refresh_token: str = Field(..., min_length=20)


class LogoutRequest(BaseModel):
    refresh_token: str = Field(..., min_length=20)


class RegisterResponse(BaseModel):
    id: str
    email: str
    role: str


class TokenPairResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: str = "user"


class ChatMessageItem(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: str
    created_at: str
    kaynaklar: list | None = None


class ChatHistoryResponse(BaseModel):
    messages: list[ChatMessageItem]
    total: int


class ConversationSummary(BaseModel):
    conversation_id: str
    message_count: int
    last_message_at: str
    title: str | None = None


class ConversationListResponse(BaseModel):
    conversations: list[ConversationSummary]
    total: int


class DokumanAnalizCevap(BaseModel):
    yanit: str
    belge_ozeti: str
    kaynaklar: list
    kategori: str = "Genel Hukuk"
    conversation_id: str | None = None
    guest_session_id: str | None = None
    message_id: str | None = None
    uyari: str = "Bu yanit bilgi amaclidir ve hukuki tavsiye niteligi tasimaz."


class AdminGenelIstatistik(BaseModel):
    toplam_kullanici: int
    toplam_mesaj: int
    toplam_konusma: int
    toplam_begeni: int
    toplam_begenmeme: int


class AdminKategoriItem(BaseModel):
    kategori: str
    sayi: int


class AdminFeedbackOzet(BaseModel):
    begeni: int
    begenmeme: int
    toplam: int
    begeni_orani: float | None = None


class AdminGunlukAktiviteItem(BaseModel):
    tarih: str
    mesaj_sayisi: int
    konusma_sayisi: int = 0
    kullanici_sayisi: int = 0


class TaslakAlan(BaseModel):
    ad: str
    etiket: str
    zorunlu: bool


class TaslakBilgi(BaseModel):
    id: str
    baslik: str
    aciklama: str
    alanlar: list[TaslakAlan]


class TaslakListResponse(BaseModel):
    taslaklar: list[TaslakBilgi]


class TaslakOlusturRequest(BaseModel):
    alanlar: dict[str, str]
    language: str = Field(default="tr", pattern="^(tr|en)$")


class FeedbackGonder(BaseModel):
    message_id: str = Field(..., min_length=36, max_length=36)
    puan: int
    guest_session_id: str | None = Field(default=None, min_length=36, max_length=36)

    @field_validator("puan")
    @classmethod
    def puan_gecerli_olmali(cls, v: int) -> int:
        if v not in (1, -1):
            raise ValueError("Puan 1 (beğendi) veya -1 (beğenmedi) olmalıdır")
        return v


class FeedbackCevap(BaseModel):
    basarili: bool
    mesaj: str


class HesapSil(BaseModel):
    mevcut_sifre: str = Field(..., min_length=1, max_length=128)


class ProfilGuncelle(BaseModel):
    email: str | None = Field(default=None, min_length=5, max_length=255)
    yeni_sifre: str | None = Field(default=None, min_length=8, max_length=128)
    mevcut_sifre: str = Field(..., min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def email_gecerli_olmali(cls, v: str | None) -> str | None:
        if v and not re.match(r"^[^@]+@[^@]+\.[^@]+$", v):
            raise ValueError("Geçersiz e-posta formatı")
        return v


class ProfilCevap(BaseModel):
    id: str
    email: str
    role: str


class AdminKullaniciItem(BaseModel):
    id: str
    email: str
    role: str
    is_active: bool
    created_at: str


class AdminKullaniciListeCevap(BaseModel):
    kullanicilar: list[AdminKullaniciItem]
    total: int


class AdminRolGuncelle(BaseModel):
    rol: str


class AdminZayifSorguItem(BaseModel):
    id: str
    soru: str
    max_skor: float
    kategori: str | None = None


class ForumThreadOlustur(BaseModel):
    title: str = Field(..., min_length=5, max_length=200)
    content: str = Field(..., min_length=10)
    category: str = Field(..., min_length=2, max_length=50)


class ForumThreadGuncelle(BaseModel):
    title: str | None = Field(default=None, min_length=5, max_length=200)
    content: str | None = Field(default=None, min_length=10)


class ForumThreadItem(BaseModel):
    id: str
    title: str
    content: str
    category: str
    is_locked: bool
    user_id: str
    user_email: str
    reply_count: int
    vote_score: int
    created_at: str
    updated_at: str


class ForumThreadListeCevap(BaseModel):
    threads: list[ForumThreadItem]
    total: int
    page: int
    size: int


class ForumReplyOlustur(BaseModel):
    content: str = Field(..., min_length=5)


class ForumReplyGuncelle(BaseModel):
    content: str = Field(..., min_length=5)


class ForumReplyItem(BaseModel):
    id: str
    thread_id: str
    content: str
    is_verified: bool
    user_id: str
    user_email: str
    user_role: str
    vote_score: int
    created_at: str
    updated_at: str


class ForumThreadDetay(BaseModel):
    thread: ForumThreadItem
    replies: list[ForumReplyItem]


class ForumOyGonder(BaseModel):
    value: int

    @field_validator("value")
    @classmethod
    def value_gecerli_olmali(cls, v: int) -> int:
        if v not in (1, -1):
            raise ValueError("Oy değeri 1 veya -1 olmalıdır")
        return v


class ForumOyCevap(BaseModel):
    basarili: bool
    yeni_skor: int
    created_at: str
