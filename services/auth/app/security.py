from datetime import datetime, timedelta, timezone
from typing import Any

import jwt

from app.config import settings
from app.models import AdminUser, StudentUser

ALGORITHM = "HS256"
COOKIE_NAME = "chekad_access_token"
STUDENT_COOKIE_NAME = "chekad_student_token"


def _encode_token(payload: dict[str, Any]) -> str:
    return jwt.encode(
        payload,
        settings.jwt_secret.get_secret_value(),
        algorithm=ALGORITHM,
    )


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
    return _encode_token(payload), expires_in


def decode_access_token(token: str) -> dict[str, Any]:
    return jwt.decode(
        token,
        settings.jwt_secret.get_secret_value(),
        algorithms=[ALGORITHM],
        issuer=settings.jwt_issuer,
        audience=settings.jwt_audience,
        options={"require": ["sub", "iat", "exp", "iss", "aud"]},
    )


def create_student_access_token(student: StudentUser) -> tuple[str, int]:
    now = datetime.now(timezone.utc)
    expires_in = settings.jwt_expire_minutes * 60
    payload: dict[str, Any] = {
        "sub": str(student.id),
        "role": "student",
        "iat": now,
        "exp": now + timedelta(seconds=expires_in),
        "iss": settings.jwt_issuer,
        "aud": "chekad-student",
    }
    return _encode_token(payload), expires_in


def decode_student_access_token(token: str) -> dict[str, Any]:
    payload = jwt.decode(
        token,
        settings.jwt_secret.get_secret_value(),
        algorithms=[ALGORITHM],
        issuer=settings.jwt_issuer,
        audience="chekad-student",
        options={"require": ["sub", "iat", "exp", "iss", "aud"]},
    )
    if payload.get("role") != "student":
        raise jwt.InvalidTokenError("Invalid student role")
    return payload
