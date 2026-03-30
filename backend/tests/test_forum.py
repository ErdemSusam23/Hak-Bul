"""Forum endpoint testleri."""
import uuid
from collections.abc import Generator

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from auth.security import hash_password
from db.base import Base
from db.session import get_db
from main import app
import models  # noqa: F401

TEST_DB_URL = "sqlite:///./test_forum.db"
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


# ─── Yardımcılar ──────────────────────────────────────────────────────────────

def _kullanici_olustur(email: str, role: str = "user") -> str:
    """DB'ye direkt kullanıcı ekler, ID döndürür."""
    from models.user import User
    from models.enums import UserRole
    db = TestingSessionLocal()
    try:
        user = User(
            email=email,
            password_hash=hash_password("Test1234!"),
            role=UserRole(role),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user.id
    finally:
        db.close()


def _token_al(email: str, password: str = "Test1234!") -> str:
    """Login yaparak access token döndürür."""
    resp = client.post("/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


def _auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ─── Enum testleri ────────────────────────────────────────────────────────────

def test_lawyer_role_exists() -> None:
    from models.enums import UserRole
    assert UserRole.LAWYER.value == "lawyer"


def test_forum_vote_type_exists() -> None:
    from models.enums import ForumVoteType
    assert ForumVoteType.THREAD.value == "thread"
    assert ForumVoteType.REPLY.value == "reply"


def test_forum_models_importable() -> None:
    from models.forum import ForumThread, ForumReply, ForumVote
    assert ForumThread.__tablename__ == "forum_threads"
    assert ForumReply.__tablename__ == "forum_replies"
    assert ForumVote.__tablename__ == "forum_votes"


# ─── Thread testleri ──────────────────────────────────────────────────────────

def test_thread_listesi_herkese_acik() -> None:
    """Giriş yapmadan thread listesi alınabilmeli."""
    resp = client.get("/forum/threads")
    assert resp.status_code == 200
    data = resp.json()
    assert "threads" in data
    assert "total" in data


def test_thread_olustur_auth_gerekli() -> None:
    """Giriş yapmadan thread açılamaz."""
    resp = client.post("/forum/threads", json={"title": "Test başlık", "content": "Test içerik uzun metin.", "category": "İş Hukuku"})
    assert resp.status_code == 401


def test_thread_olustur_ve_listele() -> None:
    email = f"user_{uuid.uuid4().hex[:6]}@test.com"
    _kullanici_olustur(email)
    token = _token_al(email)

    resp = client.post(
        "/forum/threads",
        json={"title": "Kıdem tazminatı hakkında", "content": "İşverenim tazminatımı ödemiyor, ne yapabilirim?", "category": "İş Hukuku"},
        headers=_auth_header(token),
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Kıdem tazminatı hakkında"
    assert data["category"] == "İş Hukuku"
    assert data["is_locked"] is False
    assert data["reply_count"] == 0


def test_thread_detay_herkese_acik() -> None:
    email = f"user_{uuid.uuid4().hex[:6]}@test.com"
    _kullanici_olustur(email)
    token = _token_al(email)

    create_resp = client.post(
        "/forum/threads",
        json={"title": "Detay testi başlık", "content": "Detay testi içerik metni.", "category": "Genel Hukuk"},
        headers=_auth_header(token),
    )
    thread_id = create_resp.json()["id"]

    resp = client.get(f"/forum/threads/{thread_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert "thread" in data
    assert "replies" in data


def test_thread_guncelle_sadece_sahip() -> None:
    email = f"user_{uuid.uuid4().hex[:6]}@test.com"
    other_email = f"user_{uuid.uuid4().hex[:6]}@test.com"
    _kullanici_olustur(email)
    _kullanici_olustur(other_email)
    token = _token_al(email)
    other_token = _token_al(other_email)

    create_resp = client.post(
        "/forum/threads",
        json={"title": "Sahip testi başlık", "content": "Sahip testi içerik metni.", "category": "Genel Hukuk"},
        headers=_auth_header(token),
    )
    thread_id = create_resp.json()["id"]

    # Başka kullanıcı düzenleyemez
    resp = client.put(f"/forum/threads/{thread_id}", json={"title": "Yeni başlık"}, headers=_auth_header(other_token))
    assert resp.status_code == 403

    # Sahip düzenleyebilir
    resp = client.put(f"/forum/threads/{thread_id}", json={"title": "Güncellenmiş başlık"}, headers=_auth_header(token))
    assert resp.status_code == 200
    assert resp.json()["title"] == "Güncellenmiş başlık"


def test_thread_kilit_sadece_lawyer_veya_admin() -> None:
    user_email = f"user_{uuid.uuid4().hex[:6]}@test.com"
    lawyer_email = f"lawyer_{uuid.uuid4().hex[:6]}@test.com"
    _kullanici_olustur(user_email)
    _kullanici_olustur(lawyer_email, role="lawyer")
    user_token = _token_al(user_email)
    lawyer_token = _token_al(lawyer_email)

    create_resp = client.post(
        "/forum/threads",
        json={"title": "Kilit testi başlık", "content": "Kilit testi içerik metni.", "category": "Genel Hukuk"},
        headers=_auth_header(user_token),
    )
    thread_id = create_resp.json()["id"]

    # Normal kullanıcı kilitleyemez
    resp = client.patch(f"/forum/threads/{thread_id}/lock", params={"locked": True}, headers=_auth_header(user_token))
    assert resp.status_code == 403

    # Lawyer kilitleyebilir
    resp = client.patch(f"/forum/threads/{thread_id}/lock", params={"locked": True}, headers=_auth_header(lawyer_token))
    assert resp.status_code == 200
    assert resp.json()["is_locked"] is True


# ─── Reply testleri ───────────────────────────────────────────────────────────

def test_yanit_yazma_kilitli_thread_engeller() -> None:
    user_email = f"user_{uuid.uuid4().hex[:6]}@test.com"
    lawyer_email = f"lawyer_{uuid.uuid4().hex[:6]}@test.com"
    _kullanici_olustur(user_email)
    _kullanici_olustur(lawyer_email, role="lawyer")
    user_token = _token_al(user_email)
    lawyer_token = _token_al(lawyer_email)

    create_resp = client.post(
        "/forum/threads",
        json={"title": "Kilitli thread yanıt", "content": "Kilitli thread test içerik.", "category": "Genel Hukuk"},
        headers=_auth_header(user_token),
    )
    thread_id = create_resp.json()["id"]

    # Kilitle
    client.patch(f"/forum/threads/{thread_id}/lock", params={"locked": True}, headers=_auth_header(lawyer_token))

    # Kilitli thread'e yanıt yazılamaz
    resp = client.post(f"/forum/threads/{thread_id}/replies", json={"content": "Yanıt denemesi"}, headers=_auth_header(user_token))
    assert resp.status_code == 400


def test_yanit_onay_sadece_lawyer() -> None:
    user_email = f"user_{uuid.uuid4().hex[:6]}@test.com"
    lawyer_email = f"lawyer_{uuid.uuid4().hex[:6]}@test.com"
    _kullanici_olustur(user_email)
    _kullanici_olustur(lawyer_email, role="lawyer")
    user_token = _token_al(user_email)
    lawyer_token = _token_al(lawyer_email)

    create_resp = client.post(
        "/forum/threads",
        json={"title": "Onay testi başlık", "content": "Onay testi içerik metni.", "category": "Genel Hukuk"},
        headers=_auth_header(user_token),
    )
    thread_id = create_resp.json()["id"]

    reply_resp = client.post(f"/forum/threads/{thread_id}/replies", json={"content": "Lawyer tarafından yanıt"}, headers=_auth_header(lawyer_token))
    reply_id = reply_resp.json()["id"]

    # Normal kullanıcı onaylayamaz
    resp = client.patch(f"/forum/replies/{reply_id}/verify", params={"verified": True}, headers=_auth_header(user_token))
    assert resp.status_code == 403

    # Lawyer onaylayabilir
    resp = client.patch(f"/forum/replies/{reply_id}/verify", params={"verified": True}, headers=_auth_header(lawyer_token))
    assert resp.status_code == 200
    assert resp.json()["is_verified"] is True


# ─── Oy testleri ─────────────────────────────────────────────────────────────

def test_thread_oy_gonder() -> None:
    email = f"user_{uuid.uuid4().hex[:6]}@test.com"
    _kullanici_olustur(email)
    token = _token_al(email)

    create_resp = client.post(
        "/forum/threads",
        json={"title": "Oy testi başlık", "content": "Oy testi içerik metni.", "category": "Genel Hukuk"},
        headers=_auth_header(token),
    )
    thread_id = create_resp.json()["id"]

    resp = client.post(f"/forum/threads/{thread_id}/vote", json={"value": 1}, headers=_auth_header(token))
    assert resp.status_code == 200
    assert resp.json()["yeni_skor"] == 1

    # Aynı kullanıcı oyu günceller
    resp = client.post(f"/forum/threads/{thread_id}/vote", json={"value": -1}, headers=_auth_header(token))
    assert resp.status_code == 200
    assert resp.json()["yeni_skor"] == -1


def test_oy_auth_gerekli() -> None:
    email = f"user_{uuid.uuid4().hex[:6]}@test.com"
    _kullanici_olustur(email)
    token = _token_al(email)

    create_resp = client.post(
        "/forum/threads",
        json={"title": "Auth oy testi", "content": "Auth oy testi içerik metni.", "category": "Genel Hukuk"},
        headers=_auth_header(token),
    )
    thread_id = create_resp.json()["id"]

    resp = client.post(f"/forum/threads/{thread_id}/vote", json={"value": 1})
    assert resp.status_code == 401
