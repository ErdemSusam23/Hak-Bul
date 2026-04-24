import os
import sys
from dataclasses import dataclass
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from auth.security import hash_password
from db.session import SessionLocal
from models.enums import UserRole
from models.user import User


@dataclass(frozen=True)
class AdminSeedConfig:
    email: str
    password: str


def load_config_from_env() -> AdminSeedConfig:
    return AdminSeedConfig(
        email=os.getenv("ADMIN_EMAIL", ""),
        password=os.getenv("ADMIN_PASSWORD", ""),
    )


def _normalize_config(config: AdminSeedConfig) -> AdminSeedConfig:
    email = config.email.strip().lower()
    password = config.password.strip()

    if not email:
        raise ValueError("ADMIN_EMAIL zorunludur.")
    if not password:
        raise ValueError("ADMIN_PASSWORD zorunludur.")
    if len(password) < 8:
        raise ValueError("ADMIN_PASSWORD en az 8 karakter olmalıdır.")
    if len(password.encode("utf-8")) > 72:
        raise ValueError("ADMIN_PASSWORD bcrypt için en fazla 72 byte olmalıdır.")

    return AdminSeedConfig(email=email, password=password)


def seed_admin(session_factory=SessionLocal, config: AdminSeedConfig | None = None) -> str:
    normalized = _normalize_config(config or load_config_from_env())
    db = session_factory()
    try:
        user = db.query(User).filter(User.email == normalized.email).first()
        if user:
            if user.role != UserRole.ADMIN:
                user.role = UserRole.ADMIN
                user.is_active = True
                db.commit()
                return "promoted"
            if not user.is_active:
                user.is_active = True
                db.commit()
                return "activated"
            return "exists"

        db.add(
            User(
                email=normalized.email,
                password_hash=hash_password(normalized.password),
                role=UserRole.ADMIN,
                is_active=True,
            )
        )
        db.commit()
        return "created"
    finally:
        db.close()


def main() -> None:
    result = seed_admin()
    print(f"Admin seed completed: {result}")


if __name__ == "__main__":
    main()
