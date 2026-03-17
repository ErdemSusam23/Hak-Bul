"""Admin analytics endpoint testleri."""
from collections.abc import Generator

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from db.base import Base
from db.session import get_db
import main
from main import app
import models  # noqa: F401

TEST_DB_URL = "sqlite:///./test_admin.db"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db() -> Generator[Session, None, None]:
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


def fake_pipeline(soru: str, max_kaynak: int) -> dict:
    return {"yanit": f"Yanıt: {soru}", "kaynaklar": [], "kategori": "İş Hukuku"}


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


def _admin_token() -> str:
    """Admin kullanıcı oluştur ve token döndür."""
    client.post("/auth/register", json={"email": "admin@test.com", "password": "AdminPass123"})
    # Rolü doğrudan DB'de admin yap
    db = TestingSessionLocal()
    try:
        from models.user import User
        from models.enums import UserRole
        user = db.query(User).filter(User.email == "admin@test.com").first()
        user.role = UserRole.ADMIN
        db.commit()
    finally:
        db.close()
    login = client.post("/auth/login", json={"email": "admin@test.com", "password": "AdminPass123"})
    return login.json()["access_token"]


def _user_token() -> str:
    client.post("/auth/register", json={"email": "user@test.com", "password": "UserPass123"})
    login = client.post("/auth/login", json={"email": "user@test.com", "password": "UserPass123"})
    return login.json()["access_token"]


def test_admin_stats_yetkisiz_401():
    r = client.get("/admin/stats")
    assert r.status_code == 401


def test_admin_stats_normal_kullanici_403():
    token = _user_token()
    r = client.get("/admin/stats", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 403


def test_admin_stats_bos_db():
    token = _admin_token()
    r = client.get("/admin/stats", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    data = r.json()
    assert "toplam_kullanici" in data
    assert "toplam_mesaj" in data
    assert "toplam_konusma" in data
    assert data["toplam_begeni"] == 0
    assert data["toplam_begenmeme"] == 0


def test_admin_stats_mesaj_sonrasi():
    token = _admin_token()
    # Bir soru sor — mesaj sayısı artsın
    client.post(
        "/ask",
        json={"soru": "Is hukuku hakkinda bilgi verir misiniz detayli?", "max_kaynak": 3},
        headers={"Authorization": f"Bearer {token}"},
    )
    r = client.get("/admin/stats", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["toplam_mesaj"] >= 2  # user + assistant


def test_admin_kategori_listesi():
    token = _admin_token()
    r = client.get("/admin/stats/categories", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert isinstance(r.json(), list)
    if r.json():
        assert "kategori" in r.json()[0]
        assert "sayi" in r.json()[0]


def test_admin_feedback_ozeti():
    token = _admin_token()
    r = client.get("/admin/stats/feedback", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    data = r.json()
    assert "begeni" in data
    assert "begenmeme" in data
    assert "toplam" in data


def test_admin_gunluk_aktivite():
    token = _admin_token()
    r = client.get("/admin/stats/daily?gun=7", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert isinstance(r.json(), list)
    if r.json():
        assert "tarih" in r.json()[0]
        assert "mesaj_sayisi" in r.json()[0]


def test_admin_gunluk_aktivite_gecersiz_gun():
    token = _admin_token()
    r = client.get("/admin/stats/daily?gun=0", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 422  # ge=1 constraint
