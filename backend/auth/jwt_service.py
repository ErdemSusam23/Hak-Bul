import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from jose import JWTError, jwt

from config import settings


class TokenDecodeError(Exception):
    pass


def _build_claims(subject: str, token_type: str, expires_delta: timedelta, role: str | None = None) -> dict[str, Any]:
    now = datetime.now(UTC)
    claims: dict[str, Any] = {
        "sub": subject,
        "type": token_type,
        "jti": str(uuid.uuid4()),
        "iat": now,
        "exp": now + expires_delta,
    }
    if role is not None:
        claims["role"] = role
    return claims


def create_access_token(subject: str, role: str) -> tuple[str, str]:
    claims = _build_claims(
        subject=subject,
        token_type="access",
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        role=role,
    )
    token = jwt.encode(claims, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return token, claims["jti"]


def create_refresh_token(subject: str) -> tuple[str, str, datetime]:
    expires_delta = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    claims = _build_claims(
        subject=subject,
        token_type="refresh",
        expires_delta=expires_delta,
    )
    token = jwt.encode(claims, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return token, claims["jti"], claims["exp"]


def decode_token(token: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except JWTError as exc:
        raise TokenDecodeError("Invalid or expired token.") from exc

    if not payload.get("sub") or not payload.get("jti") or not payload.get("type"):
        raise TokenDecodeError("Token payload is missing required claims.")

    return payload
