from collections.abc import Generator

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from db.base import Base
from db.session import get_db
from main import app
import models  # noqa: F401

TEST_DB_URL = "sqlite:///./test_auth.db"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


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


def test_register_and_duplicate_email() -> None:
    payload = {"email": "test@example.com", "password": "strongpass123"}
    response = client.post("/auth/register", json=payload)
    assert response.status_code == 201
    assert response.json()["email"] == payload["email"]

    duplicate = client.post("/auth/register", json=payload)
    assert duplicate.status_code == 409


def test_login_returns_tokens() -> None:
    response = client.post("/auth/login", json={"email": "test@example.com", "password": "strongpass123"})
    assert response.status_code == 200
    body = response.json()
    assert "access_token" in body
    assert "refresh_token" in body


def test_login_invalid_password() -> None:
    response = client.post("/auth/login", json={"email": "test@example.com", "password": "wrongpass123"})
    assert response.status_code == 401


def test_refresh_rotation_blocks_old_refresh_token() -> None:
    client.post("/auth/login", json={"email": "test@example.com", "password": "strongpass123"})
    old_refresh_token = client.cookies["refresh_token"]

    rotated = client.post("/auth/refresh")
    assert rotated.status_code == 200

    reuse_old = client.post("/auth/refresh", cookies={"refresh_token": old_refresh_token})
    assert reuse_old.status_code == 401


def test_logout_revokes_refresh_token() -> None:
    client.post("/auth/login", json={"email": "test@example.com", "password": "strongpass123"})
    old_refresh_token = client.cookies["refresh_token"]

    logout = client.post("/auth/logout")
    assert logout.status_code == 204

    refresh = client.post("/auth/refresh", cookies={"refresh_token": old_refresh_token})
    assert refresh.status_code == 401


def test_profile_email_change_revokes_refresh_tokens() -> None:
    client.post("/auth/login", json={"email": "test@example.com", "password": "strongpass123"})
    old_refresh_token = client.cookies["refresh_token"]
    access_token = client.post(
        "/auth/login", json={"email": "test@example.com", "password": "strongpass123"}
    ).json()["access_token"]

    update = client.put(
        "/auth/profile",
        json={"email": "test-new@example.com", "mevcut_sifre": "strongpass123"},
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert update.status_code == 200

    refresh = client.post("/auth/refresh", cookies={"refresh_token": old_refresh_token})
    assert refresh.status_code == 401


def test_profile_rejects_same_password() -> None:
    access_token = client.post(
        "/auth/login", json={"email": "test-new@example.com", "password": "strongpass123"}
    ).json()["access_token"]

    update = client.put(
        "/auth/profile",
        json={"yeni_sifre": "strongpass123", "mevcut_sifre": "strongpass123"},
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert update.status_code == 400
    assert update.json()["detail"]["error"] == "same_password_not_allowed"


def test_delete_account_accepts_body_and_deactivates_user() -> None:
    from models.user import User

    register = client.post("/auth/register", json={"email": "delete-me@example.com", "password": "StrongPass123"})
    assert register.status_code == 201
    login = client.post("/auth/login", json={"email": "delete-me@example.com", "password": "StrongPass123"})
    token = login.json()["access_token"]

    response = client.delete(
        "/auth/account",
        json={"mevcut_sifre": "StrongPass123"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 204

    db = TestingSessionLocal()
    try:
        user = db.query(User).filter(User.email == "delete-me@example.com").first()
        assert user is not None
        assert user.is_active is False
    finally:
        db.close()

    relogin = client.post("/auth/login", json={"email": "delete-me@example.com", "password": "StrongPass123"})
    assert relogin.status_code == 401


def test_delete_account_clears_chat_history_and_shared_conversations() -> None:
    from models.chat_history import ChatHistory
    from models.enums import MessageRole
    from models.shared_conversation import SharedConversation
    from models.user import User

    register = client.post("/auth/register", json={"email": "cleanup@example.com", "password": "StrongPass123"})
    assert register.status_code == 201
    login = client.post("/auth/login", json={"email": "cleanup@example.com", "password": "StrongPass123"})
    token = login.json()["access_token"]

    db = TestingSessionLocal()
    try:
        user = db.query(User).filter(User.email == "cleanup@example.com").first()
        assert user is not None
        conversation_id = "00000000-0000-0000-0000-000000000123"
        db.add(
            ChatHistory(
                user_id=user.id,
                conversation_id=conversation_id,
                role=MessageRole.USER,
                content="Test conversation content",
            )
        )
        share = SharedConversation(user_id=user.id, conversation_id=conversation_id)
        db.add(share)
        db.commit()
        share_token = share.share_token
    finally:
        db.close()

    response = client.delete(
        "/auth/account",
        json={"mevcut_sifre": "StrongPass123"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 204

    db = TestingSessionLocal()
    try:
        user = db.query(User).filter(User.email == "cleanup@example.com").first()
        assert user is not None
        assert db.query(ChatHistory).filter(ChatHistory.user_id == user.id).count() == 0
        shared = db.query(SharedConversation).filter(SharedConversation.share_token == share_token).first()
        assert shared is not None
        assert shared.is_active is False
    finally:
        db.close()
