from uuid import UUID, uuid4

from fastapi import HTTPException, Request, Response, status

from config import settings

GUEST_SESSION_COOKIE = "guest_session_id"


def _is_valid_guest_session_id(value: str | None) -> bool:
    if not value:
        return False
    try:
        parsed = UUID(value)
    except (ValueError, TypeError):
        return False
    return str(parsed) == value


def get_guest_session_id_from_cookie(request: Request) -> str | None:
    cookie_val = request.cookies.get(GUEST_SESSION_COOKIE)
    if _is_valid_guest_session_id(cookie_val):
        return cookie_val
    return None


def resolve_guest_session_for_request(request: Request, provided_guest_session_id: str | None = None) -> str:
    cookie_guest_id = get_guest_session_id_from_cookie(request)
    if cookie_guest_id:
        return cookie_guest_id
    if _is_valid_guest_session_id(provided_guest_session_id):
        return provided_guest_session_id
    return str(uuid4())


def require_guest_session_id(request: Request) -> str:
    guest_session_id = get_guest_session_id_from_cookie(request)
    if not guest_session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Misafir oturumu bulunamadı.",
        )
    return guest_session_id


def set_guest_session_cookie(response: Response, guest_session_id: str) -> None:
    response.set_cookie(
        key=GUEST_SESSION_COOKIE,
        value=guest_session_id,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.GUEST_SESSION_EXPIRE_DAYS * 86400,
        path="/",
    )
