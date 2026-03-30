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


def fake_pipeline(soru: str, max_kaynak: int, language: str = "tr") -> dict:
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


def _kullanici_olustur(email: str, password: str = "StrongPass123") -> None:
    r = client.post("/auth/register", json={"email": email, "password": password})
    assert r.status_code in (201, 409)


def _kullanici_getir(email: str):
    db = TestingSessionLocal()
    try:
        from models.user import User
        return db.query(User).filter(User.email == email).first()
    finally:
        db.close()


def _kullanici_guncelle(email: str, role: str | None = None, is_active: bool | None = None) -> None:
    db = TestingSessionLocal()
    try:
        from models.enums import UserRole
        from models.user import User
        user = db.query(User).filter(User.email == email).first()
        assert user is not None
        if role is not None:
            user.role = UserRole(role)
        if is_active is not None:
            user.is_active = is_active
        db.commit()
    finally:
        db.close()


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


def test_admin_kullanici_listesi_arama_ve_filtreleme():
    token = _admin_token()
    headers = {"Authorization": f"Bearer {token}"}

    _kullanici_olustur("lawyer.filter@test.com")
    _kullanici_olustur("inactive.filter@test.com")
    _kullanici_olustur("normal.filter@test.com")
    _kullanici_guncelle("lawyer.filter@test.com", role="lawyer", is_active=True)
    _kullanici_guncelle("inactive.filter@test.com", role="user", is_active=False)
    _kullanici_guncelle("normal.filter@test.com", role="user", is_active=True)

    q_resp = client.get(
        "/admin/users",
        params={"q": "lawyer.filter", "limit": 50, "offset": 0},
        headers=headers,
    )
    assert q_resp.status_code == 200
    q_users = q_resp.json()["kullanicilar"]
    assert q_users
    assert all("lawyer.filter" in u["email"] for u in q_users)

    rol_resp = client.get(
        "/admin/users",
        params={"rol": "lawyer", "limit": 50, "offset": 0},
        headers=headers,
    )
    assert rol_resp.status_code == 200
    rol_users = rol_resp.json()["kullanicilar"]
    assert rol_users
    assert all(u["role"] == "lawyer" for u in rol_users)

    aktif_resp = client.get(
        "/admin/users",
        params={"aktif": False, "limit": 50, "offset": 0},
        headers=headers,
    )
    assert aktif_resp.status_code == 200
    aktif_users = aktif_resp.json()["kullanicilar"]
    assert aktif_users
    assert all(u["is_active"] is False for u in aktif_users)
    assert any(u["email"] == "inactive.filter@test.com" for u in aktif_users)

    combo_resp = client.get(
        "/admin/users",
        params={"q": "normal.filter", "rol": "user", "aktif": True, "limit": 50, "offset": 0},
        headers=headers,
    )
    assert combo_resp.status_code == 200
    combo_users = combo_resp.json()["kullanicilar"]
    assert combo_users
    assert all(u["role"] == "user" and u["is_active"] is True for u in combo_users)
    assert any(u["email"] == "normal.filter@test.com" for u in combo_users)


def test_admin_kullanici_listesi_gecersiz_rol_422():
    token = _admin_token()
    r = client.get(
        "/admin/users",
        params={"rol": "invalid-role"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 422


def test_admin_rol_guncelle_lawyer():
    token = _admin_token()
    _kullanici_olustur("to.lawyer@test.com")
    hedef = _kullanici_getir("to.lawyer@test.com")
    assert hedef is not None

    r = client.patch(
        f"/admin/users/{hedef.id}/role",
        json={"rol": "lawyer"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    assert r.json()["role"] == "lawyer"
