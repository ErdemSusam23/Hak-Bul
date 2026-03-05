from pydantic import BaseModel, Field


class AskRequest(BaseModel):
    soru: str = Field(..., min_length=10, max_length=1000)
    max_kaynak: int = Field(default=5, ge=1, le=10)
    conversation_id: str | None = Field(default=None, min_length=36, max_length=36)
    guest_session_id: str | None = Field(default=None, min_length=36, max_length=36)


class KaynakItem(BaseModel):
    kaynak_turu: str
    baslik: str
    metin_ozet: str
    skor: float
    url: str | None = None


class AskResponse(BaseModel):
    yanit: str
    kaynaklar: list[KaynakItem]
    conversation_id: str
    guest_session_id: str | None = None
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


class ChatMessageItem(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: str
    created_at: str


class ChatHistoryResponse(BaseModel):
    messages: list[ChatMessageItem]
    total: int


class ConversationSummary(BaseModel):
    conversation_id: str
    message_count: int
    last_message_at: str


class ConversationListResponse(BaseModel):
    conversations: list[ConversationSummary]
    total: int
