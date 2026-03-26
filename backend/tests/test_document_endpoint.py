"""POST /documents/analyze endpoint entegrasyon testleri."""
import io
import uuid
from collections.abc import Generator
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from db.base import Base
from db.session import get_db
from main import app
import models  # noqa: F401

TEST_DB_URL = "sqlite:///./test_document_endpoint.db"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db() -> Generator[Session, None, None]:
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


def _minimal_pdf_bytes() -> bytes:
    from pypdf import PdfWriter

    writer = PdfWriter()
    writer.add_blank_page(width=200, height=200)
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


client = TestClient(app)


def setup_module() -> None:
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def teardown_module() -> None:
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.pop(get_db, None)


def test_analyze_guest_persists_to_chat_history() -> None:
    guest_session_id = str(uuid.uuid4())

    with (
        patch("routers.documents.pdf_metin_cikar", return_value="Kira sözleşmesi önemli maddeler içeriği."),
        patch(
            "routers.documents.retrieve_context",
            return_value={"chunks": [], "kaynaklar": [], "kategori": "Genel Hukuk"},
        ),
        patch("routers.documents.generate_document_answer", return_value="Test yanıtı."),
    ):
        response = client.post(
            "/documents/analyze",
            data={"soru": "Önemli maddeler nelerdir?", "guest_session_id": guest_session_id},
            files={"dosya": ("test.pdf", _minimal_pdf_bytes(), "application/pdf")},
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["yanit"] == "Test yanıtı."
    assert payload["conversation_id"]
    assert "belge_ozeti" in payload

    # Chat history'ye kaydedildi mi?
    history = client.get(
        f"/chat/guest/history/{payload['conversation_id']}",
        params={"guest_session_id": guest_session_id},
    )
    assert history.status_code == 200
    data = history.json()
    assert data["total"] == 2
    assert "[PDF: test.pdf]" in data["messages"][0]["content"]
    assert data["messages"][1]["role"] == "assistant"


def test_analyze_invalid_pdf_returns_400() -> None:
    response = client.post(
        "/documents/analyze",
        data={"soru": "Sorum nedir?"},
        files={"dosya": ("test.pdf", b"bu pdf degil", "application/pdf")},
    )
    assert response.status_code == 400


def test_analyze_scanned_pdf_returns_400() -> None:
    with patch("routers.documents.pdf_metin_cikar", return_value="   "):
        response = client.post(
            "/documents/analyze",
            data={"soru": "Sorum nedir?"},
            files={"dosya": ("taranmis.pdf", _minimal_pdf_bytes(), "application/pdf")},
        )

    assert response.status_code == 400
