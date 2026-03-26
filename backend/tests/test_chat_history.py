from collections.abc import Generator

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from db.base import Base
from db.session import get_db
import main
from main import app
import models  # noqa: F401

TEST_DB_URL = "sqlite:///./test_chat_history.db"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db() -> Generator[Session, None, None]:
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


def fake_pipeline(soru: str, max_kaynak: int, language: str = "tr") -> dict:
    return {
        "yanit": f"Yanıt: {soru}",
        "kaynaklar": [],
    }


client = TestClient(app)


def setup_module() -> None:
    app.dependency_overrides[get_db] = override_get_db
    main._pipeline = fake_pipeline
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def teardown_module() -> None:
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.pop(get_db, None)
    main._pipeline = None


def test_guest_ask_persists_and_lists_history() -> None:
    ask_response = client.post(
        "/ask",
        json={
            "soru": "Kira sozlesmesi feshi nasil olur detayli anlatir misin?",
            "max_kaynak": 3,
        },
    )
    assert ask_response.status_code == 200
    payload = ask_response.json()
    assert payload["conversation_id"]
    assert payload["guest_session_id"]

    history_response = client.get(
        f"/chat/guest/history/{payload['conversation_id']}",
        params={"guest_session_id": payload["guest_session_id"]},
    )
    assert history_response.status_code == 200
    history = history_response.json()
    assert history["total"] == 2
    assert history["messages"][0]["role"] == "user"
    assert history["messages"][1]["role"] == "assistant"


def test_user_ask_persists_and_lists_history() -> None:
    register = client.post("/auth/register", json={"email": "chat-user@example.com", "password": "StrongPass123"})
    assert register.status_code == 201

    login = client.post("/auth/login", json={"email": "chat-user@example.com", "password": "StrongPass123"})
    assert login.status_code == 200
    token = login.json()["access_token"]

    ask_response = client.post(
        "/ask",
        json={
            "soru": "Is sozlesmesi ihbar suresi nasil hesaplanir acikla?",
            "max_kaynak": 3,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert ask_response.status_code == 200
    payload = ask_response.json()
    assert payload["conversation_id"]
    assert payload["guest_session_id"] is None

    history_response = client.get(
        f"/chat/history/{payload['conversation_id']}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert history_response.status_code == 200
    history = history_response.json()
    assert history["total"] == 2
