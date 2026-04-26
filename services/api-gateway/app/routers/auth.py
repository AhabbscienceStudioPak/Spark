"""
Authentication endpoints.
POST /auth/register  — create consumer or merchant account
POST /auth/login     — email + password → access + refresh tokens
POST /auth/refresh   — exchange refresh token for new access token
POST /auth/logout    — revoke refresh token
GET  /auth/me        — return current user profile
"""
import secrets
from datetime import datetime, timezone, timedelta

import asyncpg
import bcrypt
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr, Field
from jose import jwt

from ..config import settings
from ..db import get_pool
from ..auth import verify_token

router = APIRouter(prefix="/auth", tags=["Auth"])


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def _verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except Exception:
        return False


# ── Pydantic models ───────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, description="Minimum 8 characters")
    display_name: str = Field(..., min_length=1, max_length=100)
    role: str = Field(default="consumer", pattern="^(consumer|merchant)$")
    merchant_id: str | None = None  # required when role=merchant


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds
    user: dict


# ── Token helpers ─────────────────────────────────────────────────────────────

def _create_access_token(user_id: str, email: str, role: str, merchant_id: str | None) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_access_expire_minutes)
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "merchant_id": merchant_id,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "access",
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def _create_refresh_token() -> str:
    return secrets.token_hex(32)  # 256-bit secure random


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/register", status_code=201, response_model=AuthResponse)
async def register(body: RegisterRequest, pool: asyncpg.Pool = Depends(get_pool)) -> dict:
    """
    Creates a new consumer or merchant account.
    Returns access + refresh tokens immediately so the user is logged in.
    """
    async with pool.acquire() as conn:
        # Check email uniqueness
        existing = await conn.fetchrow("SELECT id FROM users WHERE email = $1", body.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"code": "EMAIL_TAKEN", "message": "An account with this email already exists"},
            )

        # Validate merchant_id if role is merchant
        if body.role == "merchant" and body.merchant_id:
            merchant = await conn.fetchrow(
                "SELECT id FROM merchants WHERE id = $1", body.merchant_id
            )
            if not merchant:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail={"code": "MERCHANT_NOT_FOUND", "message": "Merchant not found"},
                )

        password_hash = _hash_password(body.password)
        user = await conn.fetchrow(
            """INSERT INTO users (email, password_hash, role, merchant_id, display_name)
               VALUES ($1, $2, $3, $4, $5) RETURNING id, email, role, merchant_id, display_name""",
            body.email, password_hash, body.role,
            body.merchant_id, body.display_name,
        )

        # Create refresh token
        refresh_token = _create_refresh_token()
        refresh_expires = datetime.now(timezone.utc) + timedelta(days=settings.jwt_refresh_expire_days)
        await conn.execute(
            "INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES ($1, $2, $3)",
            refresh_token, str(user["id"]), refresh_expires,
        )

    access_token = _create_access_token(
        str(user["id"]), user["email"], user["role"],
        str(user["merchant_id"]) if user["merchant_id"] else None,
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": settings.jwt_access_expire_minutes * 60,
        "user": {
            "id": str(user["id"]),
            "email": user["email"],
            "role": user["role"],
            "display_name": user["display_name"],
            "merchant_id": str(user["merchant_id"]) if user["merchant_id"] else None,
        },
    }


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest, pool: asyncpg.Pool = Depends(get_pool)) -> dict:
    """
    Authenticates with email + password.
    Returns a short-lived access token (1h) and a long-lived refresh token (30d).
    """
    async with pool.acquire() as conn:
        user = await conn.fetchrow(
            "SELECT id, email, password_hash, role, merchant_id, display_name, is_active "
            "FROM users WHERE email = $1",
            body.email,
        )

    if not user or not _verify_password(body.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_CREDENTIALS", "message": "Incorrect email or password"},
        )

    if not user["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "ACCOUNT_DISABLED", "message": "This account has been disabled"},
        )

    async with pool.acquire() as conn:
        # Update last login
        await conn.execute(
            "UPDATE users SET last_login_at = NOW() WHERE id = $1", str(user["id"])
        )
        # Create refresh token
        refresh_token = _create_refresh_token()
        refresh_expires = datetime.now(timezone.utc) + timedelta(days=settings.jwt_refresh_expire_days)
        await conn.execute(
            "INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES ($1, $2, $3)",
            refresh_token, str(user["id"]), refresh_expires,
        )

    access_token = _create_access_token(
        str(user["id"]), user["email"], user["role"],
        str(user["merchant_id"]) if user["merchant_id"] else None,
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": settings.jwt_access_expire_minutes * 60,
        "user": {
            "id": str(user["id"]),
            "email": user["email"],
            "role": user["role"],
            "display_name": user["display_name"],
            "merchant_id": str(user["merchant_id"]) if user["merchant_id"] else None,
        },
    }


@router.post("/refresh", response_model=AuthResponse)
async def refresh(body: RefreshRequest, pool: asyncpg.Pool = Depends(get_pool)) -> dict:
    """
    Exchanges a valid refresh token for a new access token + new refresh token.
    Old refresh token is revoked (rotation).
    """
    async with pool.acquire() as conn:
        token_row = await conn.fetchrow(
            """SELECT rt.token, rt.user_id, rt.expires_at, rt.revoked,
                      u.email, u.role, u.merchant_id, u.display_name, u.is_active
               FROM refresh_tokens rt
               JOIN users u ON u.id = rt.user_id
               WHERE rt.token = $1""",
            body.refresh_token,
        )

    if not token_row:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_REFRESH_TOKEN", "message": "Refresh token not found"},
        )
    if token_row["revoked"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "TOKEN_REVOKED", "message": "Refresh token has been revoked"},
        )
    if token_row["expires_at"] < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "TOKEN_EXPIRED", "message": "Refresh token has expired — please log in again"},
        )
    if not token_row["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "ACCOUNT_DISABLED", "message": "Account has been disabled"},
        )

    async with pool.acquire() as conn:
        # Revoke old token (rotation)
        await conn.execute(
            "UPDATE refresh_tokens SET revoked = true WHERE token = $1", body.refresh_token
        )
        # Issue new refresh token
        new_refresh = _create_refresh_token()
        new_expires = datetime.now(timezone.utc) + timedelta(days=settings.jwt_refresh_expire_days)
        await conn.execute(
            "INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES ($1, $2, $3)",
            new_refresh, str(token_row["user_id"]), new_expires,
        )

    access_token = _create_access_token(
        str(token_row["user_id"]), token_row["email"], token_row["role"],
        str(token_row["merchant_id"]) if token_row["merchant_id"] else None,
    )

    return {
        "access_token": access_token,
        "refresh_token": new_refresh,
        "token_type": "bearer",
        "expires_in": settings.jwt_access_expire_minutes * 60,
        "user": {
            "id": str(token_row["user_id"]),
            "email": token_row["email"],
            "role": token_row["role"],
            "display_name": token_row["display_name"],
            "merchant_id": str(token_row["merchant_id"]) if token_row["merchant_id"] else None,
        },
    }


@router.post("/logout", status_code=200)
async def logout(body: RefreshRequest, pool: asyncpg.Pool = Depends(get_pool)) -> dict:
    """Revokes the refresh token. Access token expires naturally after 1 hour."""
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE refresh_tokens SET revoked = true WHERE token = $1", body.refresh_token
        )
    return {"success": True, "message": "Logged out successfully"}


@router.get("/me")
async def me(
    payload: dict = Depends(verify_token),
    pool: asyncpg.Pool = Depends(get_pool),
) -> dict:
    """Returns the current user's profile."""
    async with pool.acquire() as conn:
        user = await conn.fetchrow(
            "SELECT id, email, role, merchant_id, display_name, created_at, last_login_at "
            "FROM users WHERE id = $1",
            payload["sub"],
        )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "success": True,
        "data": {
            "id": str(user["id"]),
            "email": user["email"],
            "role": user["role"],
            "display_name": user["display_name"],
            "merchant_id": str(user["merchant_id"]) if user["merchant_id"] else None,
            "created_at": user["created_at"].isoformat(),
            "last_login_at": user["last_login_at"].isoformat() if user["last_login_at"] else None,
        },
    }
