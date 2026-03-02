from pydantic import BaseModel, Field


class AskRequest(BaseModel):
    soru: str = Field(..., min_length=10, max_length=1000)
    max_kaynak: int = Field(default=5, ge=1, le=10)


class KaynakItem(BaseModel):
    kaynak_turu: str
    baslik: str
    metin_ozet: str
    skor: float


class AskResponse(BaseModel):
    yanit: str
    kaynaklar: list[KaynakItem]
    uyari: str = "Bu yanıt bilgi amaçlıdır ve hukuki tavsiye niteliği taşımaz."


class SearchResponse(BaseModel):
    sonuclar: list[dict]
    toplam: int


class HealthResponse(BaseModel):
    status: str
    qdrant: str
    groq: str
    version: str = "1.0.0"