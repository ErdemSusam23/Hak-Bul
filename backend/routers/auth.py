from datetime import datetime

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

limiter = Limiter(key_func=get_remote_address)

from config import settings

from auth.dependencies import get_current_user
from auth.jwt_service import TokenDecodeError, create_access_token, create_refresh_token, decode_token
from auth.security import hash_password, hash_token, verify_password
from db.session import get_db
from models.chat_history import ChatHistory
from models.refresh_token import RefreshToken
from models.user import User
from models.shared_conversation import SharedConversation
from schemas import (
    HesapSil,
    LoginRequest,
    LogoutRequest,
    ProfilCevap,
    ProfilGuncelle,
    RefreshRequest,
    RegisterRequest,
    RegisterResponse,
    TokenPairResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
def register(request: Request, body: RegisterRequest, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == body.email.lower()).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered.")

    user = User(
        email=body.email.lower(),
        password_hash=hash_password(body.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return RegisterResponse(id=user.id, email=user.email, role=user.role.value)


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/auth",
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(key="refresh_token", path="/auth")


@router.post("/login", response_model=TokenPairResponse)
@limiter.limit("5/minute")
def login(request: Request, body: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email.lower(), User.is_active.is_(True)).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials.")

    access_token, _ = create_access_token(subject=user.id, role=user.role.value)
    refresh_token, refresh_jti, refresh_exp = create_refresh_token(subject=user.id)

    db_token = RefreshToken(
        user_id=user.id,
        jti=refresh_jti,
        token_hash=hash_token(refresh_token),
        expires_at=refresh_exp,
    )
    db.add(db_token)
    db.commit()

    _set_refresh_cookie(response, refresh_token)
    # refresh_token is now httpOnly cookie; return empty string in body for security
    return TokenPairResponse(access_token=access_token, refresh_token="", role=user.role.value)


@router.post("/refresh", response_model=TokenPairResponse)
def refresh(
    response: Response,
    db: Session = Depends(get_db),
    refresh_token_cookie: str | None = Cookie(default=None, alias="refresh_token"),
    body: RefreshRequest | None = None,
):
    # Cookie first, fall back to body for backward compat
    token_val = refresh_token_cookie or (body.refresh_token if body else None)
    if not token_val:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token bulunamadı.")
    try:
        payload = decode_token(token_val)
    except TokenDecodeError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    if payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type.")

    token_row = db.query(RefreshToken).filter(RefreshToken.jti == payload["jti"]).first()
    if not token_row:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token not recognized.")
    if token_row.revoked_at is not None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token revoked.")
    if token_row.expires_at <= datetime.utcnow():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired.")
    if token_row.token_hash != hash_token(token_val):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token.")

    user = db.query(User).filter(User.id == payload["sub"], User.is_active.is_(True)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found.")

    access_token, _ = create_access_token(subject=user.id, role=user.role.value)
    new_refresh_token, new_refresh_jti, new_refresh_exp = create_refresh_token(subject=user.id)

    token_row.revoked_at = datetime.utcnow()
    token_row.replaced_by_jti = new_refresh_jti

    db.add(
        RefreshToken(
            user_id=user.id,
            jti=new_refresh_jti,
            token_hash=hash_token(new_refresh_token),
            expires_at=new_refresh_exp,
        )
    )
    db.commit()

    _set_refresh_cookie(response, new_refresh_token)
    return TokenPairResponse(access_token=access_token, refresh_token="", role=user.role.value)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    response: Response,
    db: Session = Depends(get_db),
    refresh_token_cookie: str | None = Cookie(default=None, alias="refresh_token"),
    body: LogoutRequest | None = None,
):
    token_val = refresh_token_cookie or (body.refresh_token if body else None)
    if not token_val:
        return  # Nothing to revoke
    try:
        payload = decode_token(token_val)
    except TokenDecodeError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    if payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type.")

    token_row = db.query(RefreshToken).filter(RefreshToken.jti == payload["jti"]).first()
    if token_row and token_row.revoked_at is None:
        token_row.revoked_at = datetime.utcnow()
        db.commit()
    _clear_refresh_cookie(response)


@router.get("/profile", response_model=ProfilCevap)
def get_profile(current_user: User = Depends(get_current_user)):
    return ProfilCevap(id=current_user.id, email=current_user.email, role=current_user.role.value)


@router.put("/profile", response_model=ProfilCevap)
def update_profile(
    body: ProfilGuncelle,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(body.mevcut_sifre, current_user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Mevcut şifre hatalı.")

    should_revoke_tokens = False

    if body.email and body.email.lower() != current_user.email:
        existing = db.query(User).filter(User.email == body.email.lower()).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Bu e-posta zaten kullanılıyor.")
        current_user.email = body.email.lower()
        should_revoke_tokens = True

    if body.yeni_sifre:
        current_user.password_hash = hash_password(body.yeni_sifre)
        should_revoke_tokens = True

    if should_revoke_tokens:
        db.query(RefreshToken).filter(
            RefreshToken.user_id == current_user.id,
            RefreshToken.revoked_at.is_(None),
        ).update({"revoked_at": datetime.utcnow()}, synchronize_session=False)

    db.commit()
    db.refresh(current_user)
    return ProfilCevap(id=current_user.id, email=current_user.email, role=current_user.role.value)


@router.delete("/account", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(
    response: Response,
    body: HesapSil,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(body.mevcut_sifre, current_user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Şifre hatalı.")

    # Tüm refresh token'ları iptal et
    db.query(RefreshToken).filter(RefreshToken.user_id == current_user.id).update(
        {"revoked_at": datetime.utcnow()}, synchronize_session=False
    )
    # Paylaşılan sohbetleri devre dışı bırak
    db.query(SharedConversation).filter(SharedConversation.user_id == current_user.id).update(
        {"is_active": False}, synchronize_session=False
    )
    # Sohbet geçmişini sil
    db.query(ChatHistory).filter(ChatHistory.user_id == current_user.id).delete(synchronize_session=False)
    # Kullanıcıyı pasif yap
    current_user.is_active = False
    db.commit()
    _clear_refresh_cookie(response)

