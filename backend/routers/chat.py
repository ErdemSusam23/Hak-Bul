import io
import unicodedata
from datetime import datetime

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user
from auth.guest_session import require_guest_session_id
from db.session import get_db
from models.chat_history import ChatHistory
from models.shared_conversation import SharedConversation
from models.user import User
from schemas import ChatHistoryResponse, ChatMessageItem, ConversationListResponse, ConversationSummary
from services.chat_service import (
    count_guest_conversations,
    count_user_conversations,
    delete_guest_conversation,
    delete_user_conversation,
    get_conversation_messages_for_export,
    list_guest_conversations,
    list_guest_messages,
    list_user_conversations,
    list_user_messages,
    rename_user_conversation,
)

router = APIRouter(prefix="/chat", tags=["chat"])


@router.get("/history/{conversation_id}", response_model=ChatHistoryResponse)
def get_user_chat_history(
    conversation_id: str,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    messages, total = list_user_messages(
        db=db,
        user_id=current_user.id,
        conversation_id=conversation_id,
        limit=limit,
        offset=offset,
    )
    return ChatHistoryResponse(
        messages=[
            ChatMessageItem(
                id=row.id,
                conversation_id=row.conversation_id,
                role=row.role.value,
                content=row.content,
                created_at=row.created_at.isoformat(),
                kaynaklar=row.metadata_json.get("kaynaklar") if row.metadata_json else None,
            )
            for row in messages
        ],
        total=total,
    )


@router.get("/conversations", response_model=ConversationListResponse)
def get_user_conversations(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = list_user_conversations(db=db, user_id=current_user.id, limit=limit, offset=offset)
    total = count_user_conversations(db=db, user_id=current_user.id)
    return ConversationListResponse(
        conversations=[
            ConversationSummary(
                conversation_id=conversation_id,
                message_count=message_count,
                last_message_at=last_message_at.isoformat(),
                title=title,
            )
            for conversation_id, message_count, last_message_at, title in rows
        ],
        total=total,
    )


@router.get("/guest/history/{conversation_id}", response_model=ChatHistoryResponse)
def get_guest_chat_history(
    conversation_id: str,
    guest_session_id: str = Depends(require_guest_session_id),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    messages, total = list_guest_messages(
        db=db,
        guest_session_id=guest_session_id,
        conversation_id=conversation_id,
        limit=limit,
        offset=offset,
    )
    return ChatHistoryResponse(
        messages=[
            ChatMessageItem(
                id=row.id,
                conversation_id=row.conversation_id,
                role=row.role.value,
                content=row.content,
                created_at=row.created_at.isoformat(),
                kaynaklar=row.metadata_json.get("kaynaklar") if row.metadata_json else None,
            )
            for row in messages
        ],
        total=total,
    )


@router.get("/conversations/{conversation_id}/export")
def export_conversation_pdf(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Sohbeti PDF olarak indirir."""
    messages = get_conversation_messages_for_export(
        db=db, user_id=current_user.id, conversation_id=conversation_id
    )
    if not messages:
        raise HTTPException(status_code=404, detail="Konuşma bulunamadı.")

    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont
        from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer
        from pathlib import Path
        import reportlab

        _font = "Helvetica"
        _font_bold = "Helvetica-Bold"
        _reportlab_fonts = Path(reportlab.__file__).resolve().parent / "fonts"
        _ttf_candidates = [
            (
                "TR-DejaVu",
                "TR-DejaVu-Bold",
                "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
                "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            ),
            (
                "TR-Liberation",
                "TR-Liberation-Bold",
                "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
                "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
            ),
            (
                "TR-Vera",
                "TR-Vera-Bold",
                str(_reportlab_fonts / "Vera.ttf"),
                str(_reportlab_fonts / "VeraBd.ttf"),
            ),
        ]
        for _name, _bold_name, _reg, _bold in _ttf_candidates:
            if Path(_reg).exists() and Path(_bold).exists():
                if _name not in pdfmetrics.getRegisteredFontNames():
                    pdfmetrics.registerFont(TTFont(_name, _reg))
                if _bold_name not in pdfmetrics.getRegisteredFontNames():
                    pdfmetrics.registerFont(TTFont(_bold_name, _bold))
                _font, _font_bold = _name, _bold_name
                break

        title_style = ParagraphStyle("T", fontName=_font_bold, fontSize=14, leading=18, spaceAfter=0.3*cm, alignment=1)
        meta_style = ParagraphStyle("M", fontName=_font, fontSize=8, leading=11, textColor=(0.5, 0.5, 0.5), spaceAfter=0.3*cm, alignment=1)
        user_label = ParagraphStyle("UL", fontName=_font_bold, fontSize=9, leading=12, textColor=(0.2, 0.4, 0.8))
        user_msg = ParagraphStyle("UM", fontName=_font, fontSize=10, leading=14, leftIndent=0.5*cm, spaceAfter=0.3*cm)
        bot_label = ParagraphStyle("BL", fontName=_font_bold, fontSize=9, leading=12, textColor=(0.1, 0.6, 0.3))
        bot_msg = ParagraphStyle("BM", fontName=_font, fontSize=10, leading=14, leftIndent=0.5*cm, spaceAfter=0.4*cm)
        warn_style = ParagraphStyle("W", fontName=_font, fontSize=7, leading=10, textColor=(0.6, 0.6, 0.6), spaceBefore=0.8*cm)

        title_text = messages[0].title or f"Sohbet {conversation_id[:8]}"
        export_date = datetime.utcnow().strftime("%d.%m.%Y %H:%M") + " UTC"

        story = [
            Paragraph("Hak-Bul — Sohbet Dökümü", title_style),
            Paragraph(f"{title_text} &nbsp;|&nbsp; {export_date}", meta_style),
            Spacer(1, 0.4*cm),
        ]

        for msg in messages:
            role = msg.role.value
            content = (msg.content or "").replace("<", "&lt;").replace(">", "&gt;").replace("**", "")
            ts = msg.created_at.strftime("%H:%M")
            if role == "user":
                story.append(Paragraph(f"Siz ({ts})", user_label))
                story.append(Paragraph(content, user_msg))
            else:
                story.append(Paragraph(f"Hak-Bul ({ts})", bot_label))
                story.append(Paragraph(content, bot_msg))

        story.append(Paragraph(
            "Bu belge bilgi amaçlıdır ve hukuki tavsiye niteliği taşımaz. "
            "Kesin değerlendirme için bir avukata başvurunuz.",
            warn_style,
        ))

        buf = io.BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=2.5*cm, rightMargin=2.5*cm, topMargin=2.5*cm, bottomMargin=2.5*cm)
        doc.build(story)
        pdf_bytes = buf.getvalue()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"PDF üretilemedi: {exc}") from exc

    raw_title = messages[0].title or "sohbet"
    ascii_title = (
        unicodedata.normalize("NFKD", raw_title)
        .encode("ascii", "ignore")
        .decode("ascii")
    )
    safe_title = "".join(c for c in ascii_title if c.isalnum() or c in " _-").strip().replace(" ", "_")[:40]
    filename = f"hak-bul-{safe_title or 'sohbet'}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/conversations/{conversation_id}/share")
def share_conversation(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Konuşma için paylaşım bağlantısı oluşturur."""
    # Sohbetin gerçekten bu kullanıcıya ait olduğunu doğrula
    exists = db.query(ChatHistory.id).filter(
        ChatHistory.user_id == current_user.id,
        ChatHistory.conversation_id == conversation_id,
        ChatHistory.deleted_at.is_(None),
    ).first()
    if not exists:
        raise HTTPException(status_code=404, detail="Konuşma bulunamadı.")

    # Mevcut aktif paylaşım varsa onu döndür
    existing = db.query(SharedConversation).filter(
        SharedConversation.conversation_id == conversation_id,
        SharedConversation.user_id == current_user.id,
        SharedConversation.is_active.is_(True),
    ).first()
    if existing:
        return {"share_token": existing.share_token}

    shared = SharedConversation(conversation_id=conversation_id, user_id=current_user.id)
    db.add(shared)
    db.commit()
    return {"share_token": shared.share_token}


@router.delete("/conversations/{conversation_id}/share", status_code=204)
def unshare_conversation(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Konuşma paylaşımını devre dışı bırakır."""
    db.query(SharedConversation).filter(
        SharedConversation.conversation_id == conversation_id,
        SharedConversation.user_id == current_user.id,
    ).update({"is_active": False}, synchronize_session=False)
    db.commit()


@router.get("/shared/{share_token}", response_model=ChatHistoryResponse)
def get_shared_conversation(share_token: str, db: Session = Depends(get_db)):
    """Herkese açık: paylaşım token'ıyla sohbet geçmişini döndürür."""
    shared = db.query(SharedConversation).filter(
        SharedConversation.share_token == share_token,
        SharedConversation.is_active.is_(True),
    ).first()
    if not shared:
        raise HTTPException(status_code=404, detail="Paylaşım bağlantısı bulunamadı veya devre dışı.")

    messages = (
        db.query(ChatHistory)
        .filter(
            ChatHistory.conversation_id == shared.conversation_id,
            ChatHistory.user_id == shared.user_id,
            ChatHistory.deleted_at.is_(None),
        )
        .order_by(ChatHistory.created_at.asc())
        .all()
    )
    return ChatHistoryResponse(
        messages=[
            ChatMessageItem(
                id=row.id,
                conversation_id=row.conversation_id,
                role=row.role.value,
                content=row.content,
                created_at=row.created_at.isoformat(),
                kaynaklar=row.metadata_json.get("kaynaklar") if row.metadata_json else None,
            )
            for row in messages
        ],
        total=len(messages),
    )


@router.delete("/conversations/{conversation_id}", status_code=204)
def delete_conversation(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    found = delete_user_conversation(db=db, user_id=current_user.id, conversation_id=conversation_id)
    if not found:
        raise HTTPException(status_code=404, detail="Konuşma bulunamadı.")


@router.delete("/guest/conversations/{conversation_id}", status_code=204)
def delete_guest_conversation_route(
    conversation_id: str,
    guest_session_id: str = Depends(require_guest_session_id),
    db: Session = Depends(get_db),
):
    found = delete_guest_conversation(
        db=db,
        guest_session_id=guest_session_id,
        conversation_id=conversation_id,
    )
    if not found:
        raise HTTPException(status_code=404, detail="Konuşma bulunamadı.")


@router.patch("/conversations/{conversation_id}/title", status_code=200)
def rename_conversation(
    conversation_id: str,
    title: str = Body(..., embed=True, min_length=1, max_length=80),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    found = rename_user_conversation(db=db, user_id=current_user.id, conversation_id=conversation_id, new_title=title)
    if not found:
        raise HTTPException(status_code=404, detail="Konuşma bulunamadı.")
    return {"ok": True}


@router.get("/guest/conversations", response_model=ConversationListResponse)
def get_guest_conversations(
    guest_session_id: str = Depends(require_guest_session_id),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    rows = list_guest_conversations(db=db, guest_session_id=guest_session_id, limit=limit, offset=offset)
    total = count_guest_conversations(db=db, guest_session_id=guest_session_id)
    return ConversationListResponse(
        conversations=[
            ConversationSummary(
                conversation_id=conversation_id,
                message_count=message_count,
                last_message_at=last_message_at.isoformat(),
                title=title,
            )
            for conversation_id, message_count, last_message_at, title in rows
        ],
        total=total,
    )
