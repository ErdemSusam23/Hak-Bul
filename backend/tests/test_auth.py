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
