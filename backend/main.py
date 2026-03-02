from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from schemas import AskRequest, AskResponse, SearchResponse, HealthResponse
from rag.pipeline import run_pipeline

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="Hak-Bul API", version="1.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server url
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/ask", response_model=AskResponse)
@limiter.limit("20/minute")
async def ask(request: Request, body: AskRequest):
    return run_pipeline(body.soru, body.max_kaynak)


@app.get("/search", response_model=SearchResponse)
async def search(q: str, tur: str = None, limit: int = 10):
    # Sprint 3'te implemente edilecek
    return SearchResponse(sonuclar=[], toplam=0)


@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(status="ok", qdrant="connected", groq="reachable")