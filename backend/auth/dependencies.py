from collections.abc import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from auth.jwt_service import TokenDecodeError, decode_token
from db.session import get_db
from models.enums import UserRole
from models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
optional_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    try:
        payload = decode_token(token)
    except TokenDecodeError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type.")

    user = db.query(User).filter(User.id == payload["sub"], User.is_active.is_(True)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found.")
    return user


def get_current_user_optional(token: str | None = Depends(optional_oauth2_scheme), db: Session = Depends(get_db)) -> User | None:
    if not token:
        return None

    try:
        payload = decode_token(token)
    except TokenDecodeError:
        return None

    if payload.get("type") != "access":
        return None

    user = db.query(User).filter(User.id == payload["sub"], User.is_active.is_(True)).first()
    return user


def require_roles(allowed_roles: list[UserRole]) -> Callable[[User], User]:
    def _role_dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role.")
        return current_user

    return _role_dependency
