from pydantic import BaseModel, Field


class AskRequest(BaseModel):
    soru: str = Field(..., min_length=10, max_length=1000)
    max_kaynak: int = Field(default=5, ge=1, le=10)


class KaynakItem(BaseModel):
    kaynak_turu: str
    baslik: str
    metin_ozet: str
    skor: float
    url: str | None = None


class AskResponse(BaseModel):
    yanit: str
    kaynaklar: list[KaynakItem]
    uyari: str = "Bu yanıt bilgi amaçlıdır ve hukuki tavsiye niteliği taşımaz."


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
