import os
import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import User, AuditLog
from schemas import LoginRequest, TokenResponse
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    get_current_user,
    get_client_ip,
    JWT_SECRET,
    JWT_ALGORITHM,
    REFRESH_TOKEN_EXPIRE_HOURS,
)

router = APIRouter(tags=["auth"])

COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"


@router.post("/login/", response_model=TokenResponse)
async def login(
    credentials: LoginRequest,
    response: Response,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    ip = get_client_ip(request)
    result = await db.execute(select(User).where(User.email == credentials.email.lower()))
    user = result.scalar_one_or_none()

    if not user or not verify_password(credentials.password, user.password_hash):
        log = AuditLog(
            user_id=str(user.id) if user else None,
            user_email=credentials.email.lower(),
            action="FAILED_LOGIN",
            description="Failed login attempt",
            ip_address=ip,
        )
        db.add(log)
        await db.commit()
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    access_token = create_access_token(str(user.id), user.email, user.is_admin)
    refresh_token = create_refresh_token(str(user.id))

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        max_age=REFRESH_TOKEN_EXPIRE_HOURS * 3600,
        path="/",
    )

    log = AuditLog(
        user_id=str(user.id),
        user_email=user.email,
        action="LOGIN",
        description="Successful login",
        ip_address=ip,
    )
    db.add(log)
    await db.commit()

    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/token/refresh/", response_model=TokenResponse)
async def refresh_token(request: Request, db: AsyncSession = Depends(get_db)):
    refresh = request.cookies.get("refresh_token")
    if not refresh:
        raise HTTPException(status_code=401, detail="No refresh token")

    try:
        payload = jwt.decode(refresh, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    result = await db.execute(
        select(User).where(User.id == payload["sub"], User.is_active == True)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    access_token = create_access_token(str(user.id), user.email, user.is_admin)
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/logout/")
async def logout(
    response: Response,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ip = get_client_ip(request)
    response.delete_cookie(key="refresh_token", path="/")

    log = AuditLog(
        user_id=str(current_user.id),
        user_email=current_user.email,
        action="LOGOUT",
        description="User logged out",
        ip_address=ip,
    )
    db.add(log)
    await db.commit()

    return {"message": "Logged out successfully"}


@router.get("/verify/")
async def verify_token(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from models import UserAppPermission, App

    result = await db.execute(
        select(UserAppPermission, App)
        .join(App, App.id == UserAppPermission.app_id)
        .where(
            UserAppPermission.user_id == current_user.id,
            UserAppPermission.is_active == True,
            App.is_active == True,
        )
    )
    rows = result.all()

    return {
        "user": {
            "id": str(current_user.id),
            "email": current_user.email,
            "full_name": current_user.full_name,
            "is_active": current_user.is_active,
            "is_admin": current_user.is_admin,
        },
        "permissions": [
            {
                "app": {"id": str(app.id), "name": app.name, "slug": app.slug},
                "role": perm.role,
                "permission_id": str(perm.id),
            }
            for perm, app in rows
        ],
    }


@router.get("/me/")
async def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "full_name": current_user.full_name,
        "is_active": current_user.is_active,
        "is_admin": current_user.is_admin,
    }


@router.post("/google/login/", response_model=TokenResponse)
async def google_login(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """Verify a Google ID token and issue an MPS Auth JWT.
    The Google account email must match an existing active user."""
    import asyncio
    from google.oauth2 import id_token as google_id_token
    from google.auth.transport import requests as google_requests

    client_id = os.environ.get("GOOGLE_CLIENT_ID", "")
    if not client_id:
        raise HTTPException(status_code=500, detail="Google OAuth is not configured on this server")

    body = await request.json()
    credential = body.get("credential")
    if not credential:
        raise HTTPException(status_code=400, detail="Google credential is required")

    # Verify the ID token against Google's public keys
    try:
        idinfo = await asyncio.to_thread(
            google_id_token.verify_oauth2_token,
            credential,
            google_requests.Request(),
            client_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid Google token: {exc}")

    email = idinfo.get("email", "").lower()
    if not email:
        raise HTTPException(status_code=400, detail="No email returned from Google")
    if not idinfo.get("email_verified"):
        raise HTTPException(status_code=401, detail="Google account email is not verified")

    # Must match an existing, active MPS Auth account
    result = await db.execute(
        select(User).where(User.email == email, User.is_active == True)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=403,
            detail="No MPS Auth account found for this Google account. Contact your administrator.",
        )

    ip = get_client_ip(request)
    access_token = create_access_token(str(user.id), user.email, user.is_admin)
    refresh_token = create_refresh_token(str(user.id))

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        max_age=REFRESH_TOKEN_EXPIRE_HOURS * 3600,
        path="/",
    )

    db.add(AuditLog(
        user_id=str(user.id),
        user_email=user.email,
        action="LOGIN",
        description="Login via Google OAuth",
        ip_address=ip,
    ))
    await db.commit()

    return {"access_token": access_token, "token_type": "bearer"}
