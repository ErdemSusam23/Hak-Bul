"""
main.py - Hak-Bul backend entrypoint
"""

import os
import warnings

import json

from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user_optional
from config import settings
from routers.auth import router as auth_router
from routers.chat import router as chat_router
from routers.documents import router as documents_router
from routers.feedback import router as feedback_router
from routers.admin import router as admin_router
from routers.templates import router as templates_router
from db.session import get_db
from models.user import User
from schemas import AskRequest, AskResponse, HealthResponse, KaynakItem, SearchResponse
from services.admin_service import zayif_sorgu_kaydet
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
    allow_credentials=True,
)
app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(documents_router)
app.include_router(feedback_router)
app.include_router(admin_router)
app.include_router(templates_router)


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

        kaynaklar = result.get("kaynaklar", [])

        # Zayıf sorgu tespiti: kaynak yoksa veya en yüksek skor düşükse logla
        if not kaynaklar or (kaynaklar and max(k.get("skor", 0) for k in kaynaklar) < settings.SCORE_THRESHOLD):
            try:
                max_skor = max((k.get("skor", 0) for k in kaynaklar), default=0.0)
                zayif_sorgu_kaydet(db=db, soru=body.soru, max_skor=max_skor, kategori=kategori)
            except Exception:
                pass

        if current_user:
            message_id = save_chat_pair(
                db=db,
                conversation_id=conversation_id,
                user_id=current_user.id,
                user_message=body.soru,
                assistant_message=result["yanit"],
                category=kategori,
                kaynaklar=kaynaklar,
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
                kaynaklar=kaynaklar,
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


@app.post("/ask/stream")
@limiter.limit("20/minute")
async def ask_stream(
    request: Request,
    body: AskRequest,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    """SSE streaming yanıt endpoint'i. Önce kaynakları JSON olarak gönderir,
    sonra yanıt metnini token token akıtır."""
    from rag.categorizer import get_kategorilendirici
    from rag.generator import generate_answer_stream
    from rag.pipeline import _deduplicate_sources, _format_sources
    from rag.query_rewriter import rewrite_query
    from rag.retriever import filter_by_score, retrieve_chunks

    try:
        kategori = get_kategorilendirici().kategorile(body.soru)
        rewritten = rewrite_query(body.soru)
        chunks = retrieve_chunks(rewritten, top_n=body.max_kaynak * 2)
        filtered = filter_by_score(chunks, threshold=settings.SCORE_THRESHOLD)
        filtered = _deduplicate_sources(filtered)[: body.max_kaynak]
        kaynaklar = _format_sources(filtered)
        conversation_id = resolve_conversation_id(body.conversation_id)

        guest_session_id: str | None = None
        if not current_user:
            guest_session_id = resolve_guest_session_id(body.guest_session_id)

    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    async def event_stream():
        # İlk SSE mesajı: meta (kaynaklar, kategori, conversation_id)
        meta = {
            "type": "meta",
            "kaynaklar": kaynaklar,
            "kategori": kategori,
            "conversation_id": conversation_id,
            "guest_session_id": guest_session_id,
        }
        yield f"data: {json.dumps(meta, ensure_ascii=False)}\n\n"

        # Token token yanıt
        full_answer_parts: list[str] = []
        try:
            for token in generate_answer_stream(body.soru, filtered):
                full_answer_parts.append(token)
                payload = {"type": "token", "text": token}
                yield f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"
        except RuntimeError as exc:
            err_payload = {"type": "error", "detail": str(exc)}
            yield f"data: {json.dumps(err_payload, ensure_ascii=False)}\n\n"
            return

        full_answer = "".join(full_answer_parts)

        # Mesajları DB'ye kaydet
        try:
            if current_user:
                message_id = save_chat_pair(
                    db=db,
                    conversation_id=conversation_id,
                    user_id=current_user.id,
                    user_message=body.soru,
                    assistant_message=full_answer,
                    category=kategori,
                    kaynaklar=kaynaklar,
                )
            else:
                message_id = save_chat_pair(
                    db=db,
                    conversation_id=conversation_id,
                    guest_session_id=guest_session_id,
                    user_message=body.soru,
                    assistant_message=full_answer,
                    category=kategori,
                    kaynaklar=kaynaklar,
                )
        except Exception:
            message_id = None

        done_payload = {
            "type": "done",
            "message_id": message_id,
            "uyari": "Bu yanıt bilgi amaçlıdır ve hukuki tavsiye niteliği taşımaz.",
        }
        yield f"data: {json.dumps(done_payload, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


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
