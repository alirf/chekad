from datetime import datetime, timedelta, timezone
from typing import Any

import jwt

from app.config import settings
from app.models import AdminUser

ALGORITHM = "HS256"
COOKIE_NAME = "chekad_access_token"


def create_access_token(admin: AdminUser) -> tuple[str, int]:
    now = datetime.now(timezone.utc)
    expires_in = settings.jwt_expire_minutes * 60
    payload: dict[str, Any] = {
        "sub": str(admin.id),
        "email": admin.email,
        "role": "admin",
        "iat": now,
        "exp": now + timedelta(seconds=expires_in),
        "iss": settings.jwt_issuer,
        "aud": settings.jwt_audience,
    }
    token = jwt.encode(
        payload,
        settings.jwt_secret.get_secret_value(),
        algorithm=ALGORITHM,
    )
    return token, expires_in


def decode_access_token(token: str) -> dict[str, Any]:
    return jwt.decode(
        token,
        settings.jwt_secret.get_secret_value(),
        algorithms=[ALGORITHM],
        issuer=settings.jwt_issuer,
        audience=settings.jwt_audience,
        options={"require": ["sub", "iat", "exp", "iss", "aud"]},
    )
