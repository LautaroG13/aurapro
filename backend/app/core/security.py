"""Hashing de contraseñas (bcrypt directo, sin passlib -- passlib tiene
un conflicto de compatibilidad conocido con versiones nuevas de
`bcrypt`) y JWT (PyJWT, HS256)."""

from datetime import datetime, timedelta, timezone
from uuid import UUID

import bcrypt
import jwt

from app.core.config import settings

JWT_ALGORITHM = "HS256"


def hash_password(plain_password: str) -> str:
    return bcrypt.hashpw(plain_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def create_access_token(*, user_id: UUID, tenant_id: UUID, role: str, is_superadmin: bool = False) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {
        "sub": str(user_id),
        "tenant_id": str(tenant_id),
        "role": role,
        "is_superadmin": is_superadmin,
        "exp": expire,
    }
    return jwt.encode(payload, settings.secret_key, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Lanza jwt.PyJWTError (o subclases: ExpiredSignatureError,
    InvalidTokenError, etc.) si el token es inválido o expiró. El
    caller (TenancyMiddleware) es responsable de atraparla y devolver 401
    -- esta función no oculta el fallo."""
    return jwt.decode(token, settings.secret_key, algorithms=[JWT_ALGORITHM])
