from datetime import datetime, timezone

import bcrypt
import httpx
import jwt
from fastapi import Depends, FastAPI, HTTPException, Request, Response, status
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from urllib.parse import urlsplit

from app.config import settings
from app.db import engine, get_db
from app.models import AdminUser, MentorUser, StudentUser
from app.schemas import (
    AdminPublic,
    LoginRequest,
    LoginResponse,
    MentorAccountCreate,
    MentorAuthResponse,
    MentorLoginRequest,
    MentorPublic,
    StudentAuthResponse,
    StudentLoginRequest,
    StudentPublic,
    StudentRegisterRequest,
    StudentServicePublic,
)
from app.security import (
    COOKIE_NAME,
    MENTOR_COOKIE_NAME,
    STUDENT_COOKIE_NAME,
    create_access_token,
    create_student_access_token,
    create_mentor_access_token,
    decode_access_token,
    decode_student_access_token,
    decode_mentor_access_token,
)

app = FastAPI(
    title=f"Chekad {settings.service_name}",
    version="0.5.0",
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



def public_mentor(mentor: MentorUser) -> MentorPublic:
    return MentorPublic(
        id=mentor.id,
        mentor_profile_id=mentor.mentor_profile_id,
        phone=mentor.phone,
        display_name=mentor.display_name,
    )


def get_current_mentor(request: Request, db: Session = Depends(get_db)) -> MentorUser:
    token = request.cookies.get(MENTOR_COOKIE_NAME)
    if not token:
        authorization = request.headers.get("authorization", "")
        scheme, _, credentials = authorization.partition(" ")
        if scheme.lower() == "bearer" and credentials:
            token = credentials.strip()
    if not token:
        raise HTTPException(status_code=401, detail="برای ادامه وارد حساب مشاور شوید")
    try:
        payload = decode_mentor_access_token(token)
        mentor_id = int(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, TypeError, ValueError):
        raise HTTPException(status_code=401, detail="نشست مشاور معتبر نیست؛ دوباره وارد شوید")
    mentor = db.query(MentorUser).filter(MentorUser.id == mentor_id).first()
    if mentor is None or not mentor.is_active:
        raise HTTPException(status_code=401, detail="حساب مشاور فعال نیست")
    return mentor


def set_mentor_cookie(response: Response, mentor: MentorUser) -> int:
    token, expires_in = create_mentor_access_token(mentor)
    response.set_cookie(
        key=MENTOR_COOKIE_NAME,
        value=token,
        max_age=expires_in,
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite="lax",
        path="/",
    )
    return expires_in


def require_admin_same_origin(request: Request) -> None:
    origin = request.headers.get("origin")
    parsed = urlsplit(origin or "")
    host = request.headers.get("x-forwarded-host") or request.headers.get("host", "")
    scheme = request.headers.get("x-forwarded-proto") or request.url.scheme
    if (
        parsed.scheme not in {"http", "https"}
        or not parsed.netloc
        or parsed.path not in ("", "/")
        or parsed.query or parsed.fragment
        or parsed.username or parsed.password
        or f"{parsed.scheme}://{parsed.netloc}".lower() != f"{scheme}://{host}".lower()
    ):
        raise HTTPException(403, "مبدأ درخواست مدیریتی معتبر نیست.")


@app.post("/mentor/login", response_model=MentorAuthResponse)
def mentor_login(
    payload: MentorLoginRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    mentor = db.query(MentorUser).filter(MentorUser.phone == payload.phone).first()
    valid_password = False
    if mentor is not None:
        try:
            valid_password = bcrypt.checkpw(
                payload.password.encode("utf-8"),
                mentor.password_hash.encode("utf-8"),
            )
        except (ValueError, TypeError):
            valid_password = False
    if mentor is None or not mentor.is_active or not valid_password:
        raise HTTPException(status_code=401, detail="شماره همراه یا رمز عبور صحیح نیست.")
    expires_in = set_mentor_cookie(response, mentor)
    return MentorAuthResponse(expires_in=expires_in, mentor=public_mentor(mentor))


@app.get("/mentor/me", response_model=MentorPublic)
def mentor_me(mentor: MentorUser = Depends(get_current_mentor)):
    return public_mentor(mentor)


@app.post("/mentor/logout")
def mentor_logout(response: Response):
    response.delete_cookie(
        key=MENTOR_COOKIE_NAME,
        path="/",
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite="lax",
    )
    return {"message": "خروج از حساب مشاور انجام شد"}


@app.get("/admin/mentor-accounts")
def list_mentor_accounts(
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_admin),
):
    rows = db.query(MentorUser).order_by(MentorUser.id.desc()).all()
    return {
        "items": [
            {
                "id": row.id,
                "mentor_profile_id": row.mentor_profile_id,
                "phone": row.phone,
                "display_name": row.display_name,
                "is_active": row.is_active,
                "created_at": row.created_at,
            }
            for row in rows
        ],
        "total": len(rows),
    }


@app.post("/admin/mentor-accounts", status_code=201)
async def create_mentor_account(
    payload: MentorAccountCreate,
    request: Request,
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_admin),
):
    require_admin_same_origin(request)
    existing = db.query(MentorUser).filter(
        (MentorUser.phone == payload.phone)
        | (MentorUser.mentor_profile_id == payload.mentor_profile_id)
    ).first()
    if existing is not None:
        raise HTTPException(409, "برای این شماره همراه یا پروفایل منتور قبلاً حساب ساخته شده است.")

    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            response = await client.get(
                settings.people_internal_url.rstrip("/") + f"/mentors/{payload.mentor_profile_id}"
            )
    except httpx.RequestError as exc:
        raise HTTPException(503, "سرویس پروفایل منتورها در دسترس نیست.") from exc
    if response.status_code == 404:
        raise HTTPException(404, "پروفایل عمومی منتور پیدا نشد.")
    if response.status_code != 200:
        raise HTTPException(503, "بررسی پروفایل منتور انجام نشد.")
    try:
        profile = response.json()
    except ValueError as exc:
        raise HTTPException(503, "پاسخ سرویس پروفایل معتبر نیست.") from exc
    if (
        not isinstance(profile, dict)
        or profile.get("id") != payload.mentor_profile_id
        or profile.get("status") != "active"
        or profile.get("is_public") is not True
    ):
        raise HTTPException(422, "فقط برای پروفایل عمومی و فعال منتور می‌توان حساب ساخت.")

    mentor = MentorUser(
        mentor_profile_id=payload.mentor_profile_id,
        phone=payload.phone,
        display_name=payload.display_name,
        password_hash=bcrypt.hashpw(
            payload.password.encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8"),
        is_active=True,
    )
    db.add(mentor)
    try:
        db.commit()
        db.refresh(mentor)
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "حساب منتور با این مشخصات قبلاً ایجاد شده است.")
    return {
        "id": mentor.id,
        "mentor_profile_id": mentor.mentor_profile_id,
        "phone": mentor.phone,
        "display_name": mentor.display_name,
        "is_active": mentor.is_active,
        "created_at": mentor.created_at,
    }


@app.patch("/admin/mentor-accounts/{account_id}")
def update_mentor_account_status(
    account_id: int,
    is_active: bool,
    request: Request,
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_admin),
):
    require_admin_same_origin(request)
    mentor = db.get(MentorUser, account_id)
    if mentor is None:
        raise HTTPException(404, "حساب منتور پیدا نشد.")
    mentor.is_active = is_active
    mentor.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"id": mentor.id, "is_active": mentor.is_active}
