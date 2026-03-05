import os
from dotenv import load_dotenv

load_dotenv()

def _as_bool(name: str, default: str) -> bool:
    return os.environ.get(name, default).strip().lower() == "true"


class Settings:
    QDRANT_URL: str = os.environ.get("QDRANT_URL", "")
    QDRANT_API_KEY: str = os.environ.get("QDRANT_API_KEY", "")
    GROQ_API_KEY: str = os.environ.get("GROQ_API_KEY", "")
    COLLECTION_NAME: str = os.environ.get("QDRANT_COLLECTION", "hukuk_chunks")
    SCORE_THRESHOLD: float = float(os.environ.get("SCORE_THRESHOLD", "0.65"))
    EMBEDDING_MODEL: str = os.environ.get(
        "EMBEDDING_MODEL",
        "sentence-transformers/paraphrase-multilingual-mpnet-base-v2",
    )
    VERSION: str = os.environ.get("APP_VERSION", "1.0.0")
    CORS_ORIGINS: list[str] = os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(",")
    MOCK_MODE: bool = _as_bool("MOCK_MODE", "false")
    MOCK_RETRIEVAL: bool = _as_bool("MOCK_RETRIEVAL", "false")
    MOCK_LLM: bool = _as_bool("MOCK_LLM", "false")
    DATABASE_URL: str = os.environ.get("DATABASE_URL", "sqlite:///./hakbul.db")
    JWT_SECRET_KEY: str = os.environ.get("JWT_SECRET_KEY", "")
    JWT_ALGORITHM: str = os.environ.get("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.environ.get("REFRESH_TOKEN_EXPIRE_DAYS", "14"))


settings = Settings()

# Backward-compatible constants for existing imports.
GROQ_API_KEY = settings.GROQ_API_KEY
QDRANT_URL = settings.QDRANT_URL
QDRANT_API_KEY = settings.QDRANT_API_KEY
QDRANT_COLLECTION = settings.COLLECTION_NAME
SCORE_THRESHOLD = settings.SCORE_THRESHOLD
MOCK_MODE = settings.MOCK_MODE
MOCK_RETRIEVAL = settings.MOCK_RETRIEVAL
MOCK_LLM = settings.MOCK_LLM
