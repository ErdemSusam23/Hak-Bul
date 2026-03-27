"""Feedback endpoint testleri."""

import uuid
from collections.abc import Generator

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from db.base import Base
from db.session import get_db
from main import app
import models  # noqa: F401 - modellerin metadata'ya yuklenmesi icin

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


def _create_assistant_message(guest_session_id: str = FAKE_SESSION_ID) -> str:
    """Test icin chat_history'ye bir asistan mesaji ekler ve ID'sini dondurur."""
    from models.chat_history import ChatHistory
    from models.enums import MessageRole

    db = TestingSessionLocal()
    try:
        msg = ChatHistory(
            guest_session_id=guest_session_id,
            conversation_id=str(uuid.uuid4()),
            role=MessageRole.ASSISTANT,
            content="Test cevabi",
        )
        db.add(msg)
        db.commit()
        db.refresh(msg)
        return msg.id
    finally:
        db.close()


def test_feedback_invalid_puan() -> None:
    response = client.post(
        "/feedback",
        json={
            "message_id": str(uuid.uuid4()),
            "puan": 5,
        },
    )
    assert response.status_code == 422


def test_feedback_requires_guest_cookie_when_unauthenticated() -> None:
    message_id = _create_assistant_message()
    response = client.post(
        "/feedback",
        json={
            "message_id": message_id,
            "puan": 1,
        },
    )
    assert response.status_code == 401


def test_feedback_nonexistent_message_returns_404() -> None:
    client.cookies.set("guest_session_id", FAKE_SESSION_ID)
    response = client.post(
        "/feedback",
        json={
            "message_id": str(uuid.uuid4()),
            "puan": 1,
        },
    )
    assert response.status_code == 404


def test_feedback_thumbs_up() -> None:
    client.cookies.set("guest_session_id", FAKE_SESSION_ID)
    message_id = _create_assistant_message()
    response = client.post(
        "/feedback",
        json={
            "message_id": message_id,
            "puan": 1,
        },
    )
    assert response.status_code == 200
    assert response.json()["basarili"] is True


def test_feedback_for_other_guest_message_returns_403() -> None:
    owner_guest_session_id = str(uuid.uuid4())
    message_id = _create_assistant_message(guest_session_id=owner_guest_session_id)

    attacker = TestClient(app)
    attacker.cookies.set("guest_session_id", str(uuid.uuid4()))
    response = attacker.post(
        "/feedback",
        json={
            "message_id": message_id,
            "puan": -1,
        },
    )
    assert response.status_code == 403


def test_feedback_update_existing() -> None:
    client.cookies.set("guest_session_id", FAKE_SESSION_ID)
    message_id = _create_assistant_message()
    first = client.post(
        "/feedback",
        json={"message_id": message_id, "puan": 1},
    )
    second = client.post(
        "/feedback",
        json={"message_id": message_id, "puan": -1},
    )
    assert first.status_code == 200
    assert second.status_code == 200
