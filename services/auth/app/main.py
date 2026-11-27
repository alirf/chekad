import bcrypt
import jwt
from fastapi import Depends, FastAPI, HTTPException, Request, Response, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import settings
from app.db import engine, get_db
from app.models import AdminUser
from app.schemas import AdminPublic, LoginRequest, LoginResponse
from app.security import COOKIE_NAME, create_access_token, decode_access_token

app = FastAPI(
    title=f"Chekad {settings.service_name}",
    version="0.3.0",
    description="Authentication service for Chekad administration.",
)


@app.get("/health")
def health():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"status": "error", "service": settings.service_name, "db": "unavailable"},
        ) from exc
    return {"status": "ok", "service": settings.service_name, "db": "ok"}


def get_current_admin(request: Request, db: Session = Depends(get_db)) -> AdminUser:
    token = request.cookies.get(COOKIE_NAME)

    # Bearer support is useful for API clients and future service-to-service tests.
    if not token:
        authorization = request.headers.get("authorization", "")
        scheme, _, credentials = authorization.partition(" ")
        if scheme.lower() == "bearer" and credentials:
            token = credentials.strip()

    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="احراز هویت لازم است")

    try:
        payload = decode_access_token(token)
        admin_id = int(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, TypeError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="نشست معتبر نیست؛ دوباره وارد شوید")

    admin = db.query(AdminUser).filter(AdminUser.id == admin_id).first()
    if admin is None or not admin.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="حساب مدیر فعال نیست")
    return admin


@app.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    email = str(payload.email).strip().lower()
    admin = db.query(AdminUser).filter(AdminUser.email == email).first()

    # Keep the error identical for unknown email and wrong password.
    valid_password = False
    if admin is not None:
        try:
            valid_password = bcrypt.checkpw(
                payload.password.encode("utf-8"),
                admin.password_hash.encode("utf-8"),
            )
        except (ValueError, TypeError):
            valid_password = False

    if admin is None or not admin.is_active or not valid_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="ایمیل یا رمز عبور صحیح نیست",
        )

    token, expires_in = create_access_token(admin)
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        max_age=expires_in,
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite="lax",
        path="/",
    )
    return LoginResponse(
        expires_in=expires_in,
        admin=AdminPublic(id=admin.id, email=admin.email, name=admin.name),
    )


@app.get("/me", response_model=AdminPublic)
def me(admin: AdminUser = Depends(get_current_admin)):
    return AdminPublic(id=admin.id, email=admin.email, name=admin.name)


@app.post("/logout")
def logout(response: Response):
    response.delete_cookie(
        key=COOKIE_NAME,
        path="/",
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite="lax",
    )
    return {"message": "خروج انجام شد"}
