from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from auth.jwt_service import TokenDecodeError, create_access_token, create_refresh_token, decode_token
from auth.security import hash_password, hash_token, verify_password
from db.session import get_db
from models.refresh_token import RefreshToken
from models.user import User
from schemas import (
    LoginRequest,
    LogoutRequest,
    RefreshRequest,
    RegisterRequest,
    RegisterResponse,
    TokenPairResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
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


@router.post("/login", response_model=TokenPairResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
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

    return TokenPairResponse(access_token=access_token, refresh_token=refresh_token, role=user.role.value)


@router.post("/refresh", response_model=TokenPairResponse)
def refresh(body: RefreshRequest, db: Session = Depends(get_db)):
    try:
        payload = decode_token(body.refresh_token)
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
    if token_row.token_hash != hash_token(body.refresh_token):
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

    return TokenPairResponse(access_token=access_token, refresh_token=new_refresh_token, role=user.role.value)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(body: LogoutRequest, db: Session = Depends(get_db)):
    try:
        payload = decode_token(body.refresh_token)
    except TokenDecodeError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    if payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type.")

    token_row = db.query(RefreshToken).filter(RefreshToken.jti == payload["jti"]).first()
    if token_row and token_row.revoked_at is None:
        token_row.revoked_at = datetime.utcnow()
        db.commit()
