import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from auth.security import hash_password, verify_password
from db.base import Base
import models  # noqa: F401
from models.enums import UserRole
from models.user import User
from scripts.seed_admin import AdminSeedConfig, seed_admin


TEST_DB_URL = "sqlite:///./test_seed_admin.db"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def setup_function() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def teardown_function() -> None:
    Base.metadata.drop_all(bind=engine)


def test_seed_admin_creates_admin_user_with_hashed_password() -> None:
    result = seed_admin(
        TestingSessionLocal,
        AdminSeedConfig(email=" Admin@Example.COM ", password="AdminPass123"),
    )

    db = TestingSessionLocal()
    try:
        user = db.query(User).filter(User.email == "admin@example.com").one()
        assert result == "created"
        assert user.role == UserRole.ADMIN
        assert user.is_active is True
        assert user.password_hash != "AdminPass123"
        assert verify_password("AdminPass123", user.password_hash)
    finally:
        db.close()


def test_seed_admin_promotes_existing_user_without_changing_password() -> None:
    original_hash = hash_password("OriginalPass123")
    db = TestingSessionLocal()
    try:
        db.add(User(email="admin@example.com", password_hash=original_hash, role=UserRole.USER))
        db.commit()
    finally:
        db.close()

    result = seed_admin(
        TestingSessionLocal,
        AdminSeedConfig(email="admin@example.com", password="NewAdminPass123"),
    )

    db = TestingSessionLocal()
    try:
        user = db.query(User).filter(User.email == "admin@example.com").one()
        assert result == "promoted"
        assert user.role == UserRole.ADMIN
        assert user.password_hash == original_hash
        assert verify_password("OriginalPass123", user.password_hash)
    finally:
        db.close()


@pytest.mark.parametrize(
    ("email", "password"),
    [
        ("", "AdminPass123"),
        ("admin@example.com", ""),
        ("admin@example.com", "short"),
        ("admin@example.com", "a" * 73),
    ],
)
def test_seed_admin_rejects_missing_or_weak_env_values(email: str, password: str) -> None:
    with pytest.raises(ValueError):
        seed_admin(TestingSessionLocal, AdminSeedConfig(email=email, password=password))
