"""Feedback endpoint testleri."""
import uuid
from collections.abc import Generator

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from db.base import Base
from db.session import get_db
from main import app
import models  # noqa: F401 — tüm modellerin metadata'ya yüklenmesi için

TEST_DB_URL = "sqlite:///./test_feedback.db"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

FAKE_SESSION_ID = str(uuid.uuid4())


def override_get_db() -> Generator[Session, None, None]:
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


client = TestClient(app)


def setup_module() -> None:
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def teardown_module() -> None:
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.pop(get_db, None)


def _create_assistant_message() -> str:
    """Test için chat_history'ye bir asistan mesajı ekler ve ID'sini döndürür."""
    from models.chat_history import ChatHistory
    from models.enums import MessageRole

    db = TestingSessionLocal()
    try:
        msg = ChatHistory(
            guest_session_id=FAKE_SESSION_ID,
            conversation_id=str(uuid.uuid4()),
            role=MessageRole.ASSISTANT,
            content="Test cevabı",
        )
        db.add(msg)
        db.commit()
        db.refresh(msg)
        return msg.id
    finally:
        db.close()


def test_feedback_invalid_puan():
    """Puan 1 veya -1 dışında bir değer 422 döndürmeli."""
    response = client.post(
        "/feedback",
        json={
            "message_id": str(uuid.uuid4()),
            "puan": 5,
            "guest_session_id": FAKE_SESSION_ID,
        },
    )
    assert response.status_code == 422


def test_feedback_no_owner_returns_400():
    """Hem kullanıcı girişi hem guest_session_id yoksa 400 dönmeli."""
    response = client.post(
        "/feedback",
        json={
            "message_id": str(uuid.uuid4()),
            "puan": 1,
        },
    )
    assert response.status_code == 400


def test_feedback_nonexistent_message_returns_404():
    """Var olmayan bir mesaj ID'si ile 404 dönmeli."""
    response = client.post(
        "/feedback",
        json={
            "message_id": str(uuid.uuid4()),
            "puan": 1,
            "guest_session_id": FAKE_SESSION_ID,
        },
    )
    assert response.status_code == 404


def test_feedback_thumbs_up():
    """Geçerli bir mesaja 👍 gönderilebilmeli."""
    message_id = _create_assistant_message()
    response = client.post(
        "/feedback",
        json={
            "message_id": message_id,
            "puan": 1,
            "guest_session_id": FAKE_SESSION_ID,
        },
    )
    assert response.status_code == 200
    assert response.json()["basarili"] is True


def test_feedback_thumbs_down():
    """Geçerli bir mesaja 👎 gönderilebilmeli."""
    message_id = _create_assistant_message()
    response = client.post(
        "/feedback",
        json={
            "message_id": message_id,
            "puan": -1,
            "guest_session_id": FAKE_SESSION_ID,
        },
    )
    assert response.status_code == 200
    assert response.json()["basarili"] is True


def test_feedback_update_existing():
    """Aynı mesaja tekrar oy verildiğinde güncellenmeli (200 dönmeli)."""
    message_id = _create_assistant_message()
    client.post(
        "/feedback",
        json={"message_id": message_id, "puan": 1, "guest_session_id": FAKE_SESSION_ID},
    )
    response = client.post(
        "/feedback",
        json={"message_id": message_id, "puan": -1, "guest_session_id": FAKE_SESSION_ID},
    )
    assert response.status_code == 200
