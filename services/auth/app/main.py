from datetime import datetime, timezone

import bcrypt
import jwt
from fastapi import Depends, FastAPI, HTTPException, Request, Response, status
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import settings
from app.db import engine, get_db
from app.models import AdminUser, StudentUser
from app.schemas import (
    AdminPublic,
    LoginRequest,
    LoginResponse,
    StudentAuthResponse,
    StudentLoginRequest,
    StudentPublic,
    StudentRegisterRequest,
    StudentServicePublic,
)
from app.security import (
    COOKIE_NAME,
    STUDENT_COOKIE_NAME,
    create_access_token,
    create_student_access_token,
    decode_access_token,
    decode_student_access_token,
)

app = FastAPI(
    title=f"Chekad {settings.service_name}",
    version="0.4.0",
    description="Authentication service for Chekad administration and student accounts.",
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


def get_current_student(request: Request, db: Session = Depends(get_db)) -> StudentUser:
    token = request.cookies.get(STUDENT_COOKIE_NAME)
    if not token:
        authorization = request.headers.get("authorization", "")
        scheme, _, credentials = authorization.partition(" ")
        if scheme.lower() == "bearer" and credentials:
            token = credentials.strip()

    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="برای ادامه وارد حساب دانش‌آموزی شوید")

    try:
        payload = decode_student_access_token(token)
        student_id = int(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, TypeError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="نشست معتبر نیست؛ دوباره وارد شوید")

    student = db.query(StudentUser).filter(StudentUser.id == student_id).first()
    if student is None or not student.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="حساب دانش‌آموزی فعال نیست")
    return student


def set_student_cookie(response: Response, student: StudentUser) -> int:
    token, expires_in = create_student_access_token(student)
    response.set_cookie(
        key=STUDENT_COOKIE_NAME,
        value=token,
        max_age=expires_in,
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite="lax",
        path="/",
    )
    return expires_in


def public_student(student: StudentUser) -> StudentPublic:
    return StudentPublic(
        id=student.id,
        first_name=student.first_name,
        last_name=student.last_name,
        phone=student.phone,
        guardian_phone=student.guardian_phone,
        grade=student.grade,
        field=student.field,
        phone_verified=student.phone_verified,
    )


@app.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    email = str(payload.email).strip().lower()
    admin = db.query(AdminUser).filter(AdminUser.email == email).first()

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


@app.post(
    "/student/register",
    response_model=StudentAuthResponse,
    status_code=status.HTTP_201_CREATED,
)
def student_register(
    payload: StudentRegisterRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    if not settings.student_registration_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ثبت‌نام دانش‌آموزی هنوز از تنظیمات سامانه فعال نشده است.",
        )

    existing = db.query(StudentUser).filter(StudentUser.phone == payload.phone).first()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="برای این شماره همراه قبلاً حساب ساخته شده است. وارد حساب شوید.",
        )

    now = datetime.now(timezone.utc)
    student = StudentUser(
        phone=payload.phone,
        password_hash=bcrypt.hashpw(payload.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8"),
        first_name=payload.first_name,
        last_name=payload.last_name,
        grade=payload.grade,
        field=payload.field,
        guardian_phone=payload.guardian_phone,
        guardian_consent=True,
        guardian_consent_at=now,
        privacy_accepted_at=now,
        phone_verified=False,
        is_active=True,
    )
    db.add(student)
    try:
        db.commit()
        db.refresh(student)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="برای این شماره همراه حساب دیگری ثبت شده است.",
        )

    expires_in = set_student_cookie(response, student)
    return StudentAuthResponse(expires_in=expires_in, student=public_student(student))


@app.post("/student/login", response_model=StudentAuthResponse)
def student_login(
    payload: StudentLoginRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    student = db.query(StudentUser).filter(StudentUser.phone == payload.phone).first()
    valid_password = False
    if student is not None:
        try:
            valid_password = bcrypt.checkpw(
                payload.password.encode("utf-8"),
                student.password_hash.encode("utf-8"),
            )
        except (ValueError, TypeError):
            valid_password = False

    if student is None or not student.is_active or not valid_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="شماره همراه یا رمز عبور صحیح نیست.",
        )

    expires_in = set_student_cookie(response, student)
    return StudentAuthResponse(expires_in=expires_in, student=public_student(student))


@app.get("/student/me", response_model=StudentPublic)
def student_me(student: StudentUser = Depends(get_current_student)):
    return public_student(student)


@app.get("/student/services", response_model=list[StudentServicePublic])
def student_services(student: StudentUser = Depends(get_current_student)):
    # This is the current service directory, not a claim that the student
    # already owns a package, payment, lesson booking, or exam entitlement.
    return [
        StudentServicePublic(
            key="mentorship",
            title="مشاوره و منتورینگ",
            description="شناخت مسیر، برنامه‌ریزی و همراهی تخصصی در المپیاد فیزیک یا کامپیوتر.",
            href="/mentorship",
            action_label="مشاهده مشاوران",
            availability="available",
            note="برای شروع، درخواستت را ثبت کن تا گزینه‌های متناسب معرفی شوند.",
        ),
        StudentServicePublic(
            key="tutoring",
            title="کلاس خصوصی",
            description="آموزش متمرکز، حل مسئله و رفع اشکال با مدرس متناسب با نیاز آموزشی.",
            href="/tutoring",
            action_label="مشاهده مدرسان",
            availability="available",
            note="ثبت درخواست کلاس از صفحه مدرسان انجام می‌شود.",
        ),
        StudentServicePublic(
            key="exams",
            title="آزمون‌های المپیاد",
            description="فهرست آزمون‌های منتشرشده و اطلاعیه‌های مربوط به آن‌ها.",
            href="/exams",
            action_label="مشاهده آزمون‌ها",
            availability="catalog",
            note="ثبت‌نام و شرکت در آزمون فقط برای آزمون‌هایی فعال است که جزئیات آن‌ها منتشر شده باشد.",
        ),
        StudentServicePublic(
            key="articles",
            title="مجله تخصصی چکاد",
            description="مقالات و محتوای مرتبط با مسیر المپیاد فیزیک و کامپیوتر.",
            href="/blog",
            action_label="مطالعه مقالات",
            availability="available",
        ),
    ]


@app.post("/student/logout")
def student_logout(response: Response):
    response.delete_cookie(
        key=STUDENT_COOKIE_NAME,
        path="/",
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite="lax",
    )
    return {"message": "خروج از حساب دانش‌آموزی انجام شد"}
