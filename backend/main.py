"""
main.py - Hak-Bul backend entrypoint
"""

import os
import warnings

from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user_optional
from config import settings
from routers.auth import router as auth_router
from routers.chat import router as chat_router
from routers.feedback import router as feedback_router
from db.session import get_db
from models.user import User
from schemas import AskRequest, AskResponse, HealthResponse, KaynakItem, SearchResponse
from services.chat_service import resolve_conversation_id, resolve_guest_session_id, save_chat_pair

warnings.filterwarnings("ignore")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="Hak-Bul API",
    description="Turk hukuku RAG tabanli soru-cevap sistemi",
    version=settings.VERSION,
)

app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(feedback_router)


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={
            "error": "Rate limit exceeded",
            "detail": str(exc.detail),
            "retry_after": 60,
        },
    )


_pipeline = None
_qdrant = None


def get_pipeline():
    global _pipeline
    if _pipeline is None:
        from rag.pipeline import run_pipeline

        _pipeline = run_pipeline
    return _pipeline


def get_qdrant():
    global _qdrant
    if _qdrant is None:
        from rag.retriever import _get_qdrant

        _qdrant = _get_qdrant()
    return _qdrant


@app.post("/ask", response_model=AskResponse)
@limiter.limit("20/minute")
async def ask(
    request: Request,
    body: AskRequest,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    try:
        pipeline = get_pipeline()
        result = pipeline(soru=body.soru, max_kaynak=body.max_kaynak)
        conversation_id = resolve_conversation_id(body.conversation_id)

        guest_session_id: str | None = None
        kategori = result.get("kategori", "Genel Hukuk")

        if current_user:
            message_id = save_chat_pair(
                db=db,
                conversation_id=conversation_id,
                user_id=current_user.id,
                user_message=body.soru,
                assistant_message=result["yanit"],
                category=kategori,
            )
        else:
            guest_session_id = resolve_guest_session_id(body.guest_session_id)
            message_id = save_chat_pair(
                db=db,
                conversation_id=conversation_id,
                guest_session_id=guest_session_id,
                user_message=body.soru,
                assistant_message=result["yanit"],
                category=kategori,
            )

        return AskResponse(
            yanit=result["yanit"],
            kaynaklar=result["kaynaklar"],
            conversation_id=conversation_id,
            guest_session_id=guest_session_id,
            kategori=kategori,
            message_id=message_id,
        )
    except RuntimeError as exc:
        detail = str(exc)
        if "Groq" in detail:
            raise HTTPException(
                status_code=503,
                detail={
                    "error": "upstream_unavailable",
                    "detail": detail,
                    "retry_after": 30,
                },
            ) from exc
        raise HTTPException(status_code=500, detail=detail) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/search", response_model=SearchResponse)
async def search(
    q: str = Query(..., description="Madde no veya dava no. Ornek: 'Madde 17'"),
    tur: str | None = Query(default=None, description="kanun | yargitay_karari"),
    limit: int = Query(default=10, ge=1, le=50),
):
    if tur and tur not in {"kanun", "yargitay_karari"}:
        raise HTTPException(status_code=422, detail="tur only supports 'kanun' or 'yargitay_karari'")

    try:
        from rag.pipeline import _get_law_url
        from rag.retriever import retrieve_chunks

        chunks = retrieve_chunks(query=q, top_n=limit, kaynak_turu=tur)

        sonuclar = []
        for c in chunks:
            p = c["payload"]
            kaynak_turu = p.get("kaynak_turu", "")

            if kaynak_turu == "kanun":
                baslik = f"{p.get('kanun_adi', '?')} - {p.get('madde_no', '?')}"
            else:
                baslik = f"{p.get('daire', 'Yargitay')} - {p.get('karar_no', '?')}"

            url = _get_law_url(p.get("kanun_adi", ""), p.get("madde_no", "")) if kaynak_turu == "kanun" else None

            sonuclar.append(
                KaynakItem(
                    kaynak_turu=kaynak_turu,
                    baslik=baslik,
                    metin_ozet=p.get("metin", "")[:300],
                    skor=round(c.get("skor", 0), 4),
                    url=url,
                )
            )

        return SearchResponse(sonuclar=sonuclar, toplam=len(sonuclar))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc



@app.get("/health", response_model=HealthResponse)
async def health():
    qdrant_status = "connected"
    groq_status = "reachable"

    if settings.MOCK_RETRIEVAL:
        qdrant_status = "mock"
    else:
        from rag.retriever import has_local_corpus, is_qdrant_configured

        if not is_qdrant_configured():
            qdrant_status = "local_fallback" if has_local_corpus() else "not_configured"
        else:
            try:
                client = get_qdrant()
                client.get_collection(settings.COLLECTION_NAME)
            except Exception:
                qdrant_status = "local_fallback" if has_local_corpus() else "unreachable"

    if settings.MOCK_MODE or settings.MOCK_LLM:
        groq_status = "mock"
    elif not settings.GROQ_API_KEY or settings.GROQ_API_KEY == "your_groq_api_key_here":
        groq_status = "not_configured"

    overall = "ok" if qdrant_status in {"connected", "mock", "local_fallback"} else "degraded"

    return HealthResponse(
        status=overall,
        qdrant=qdrant_status,
        groq=groq_status,
        version=settings.VERSION,
    )
