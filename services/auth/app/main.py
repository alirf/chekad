from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import secrets

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
from app.models import AdminUser, MentorUser, StudentUser, StudentVerificationCode, TeacherUser
from app.sms import SMSDeliveryError, send_sms
from app.schemas import (
    AdminPublic,
    LoginRequest,
    LoginResponse,
    MentorAccountCreate,
    MentorAuthResponse,
    MentorLoginRequest,
    MentorPublic,
    TeacherAccountCreate,
    TeacherAuthResponse,
    TeacherLoginRequest,
    TeacherPublic,
    StudentAuthResponse,
    StudentLoginRequest,
    StudentPublic,
    StudentRegisterRequest,
    StudentServicePublic,
    StudentVerificationConfirmRequest,
    StudentVerificationResendRequest,
)
from app.security import (
    COOKIE_NAME,
    MENTOR_COOKIE_NAME,
    TEACHER_COOKIE_NAME,
    STUDENT_COOKIE_NAME,
    create_access_token,
    create_student_access_token,
    create_mentor_access_token,
    decode_access_token,
    decode_student_access_token,
    decode_mentor_access_token,
    create_teacher_access_token,
    decode_teacher_access_token,
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
        guardian_consent=student.guardian_consent,
    )


VERIFICATION_CODE_ATTEMPT_LIMIT = 5


def _verification_code_hash(student_id: int, purpose: str, code: str) -> str:
    material = f"{student_id}:{purpose}:{code}".encode("utf-8")
    configured_secret = settings.otp_hash_secret.get_secret_value()
    secret = (configured_secret or settings.jwt_secret.get_secret_value()).encode("utf-8")
    return hmac.new(secret, material, hashlib.sha256).hexdigest()


def _create_verification_challenge(
    db: Session,
    student: StudentUser,
    purpose: str,
) -> tuple[StudentVerificationCode, str]:
    if purpose == "guardian_consent" and student.phone == student.guardian_phone:
        raise HTTPException(
            409,
            "شماره سرپرست باید با شماره دانش‌آموز متفاوت باشد؛ برای اصلاح شماره با پشتیبانی چکاد تماس بگیرید.",
        )

    now = datetime.now(timezone.utc)
    recent_count = (
        db.query(StudentVerificationCode)
        .filter(
            StudentVerificationCode.student_id == student.id,
            StudentVerificationCode.purpose == purpose,
            StudentVerificationCode.created_at >= now - timedelta(days=1),
        )
        .count()
    )
    if recent_count >= settings.sms_max_daily_sends:
        raise HTTPException(429, "سقف روزانه ارسال کد تأیید برای این مرحله به پایان رسیده است.")

    previous = (
        db.query(StudentVerificationCode)
        .filter(
            StudentVerificationCode.student_id == student.id,
            StudentVerificationCode.purpose == purpose,
        )
        .order_by(StudentVerificationCode.created_at.desc(), StudentVerificationCode.id.desc())
        .first()
    )
    if previous is not None:
        previous_created_at = previous.created_at
        if previous_created_at.tzinfo is None:
            previous_created_at = previous_created_at.replace(tzinfo=timezone.utc)
        elapsed = (now - previous_created_at).total_seconds()
        if elapsed < settings.sms_resend_cooldown_seconds:
            remaining = max(1, int(settings.sms_resend_cooldown_seconds - elapsed))
            raise HTTPException(429, f"برای ارسال دوباره کد، {remaining} ثانیه صبر کنید.")

    db.query(StudentVerificationCode).filter(
        StudentVerificationCode.student_id == student.id,
        StudentVerificationCode.purpose == purpose,
        StudentVerificationCode.consumed_at.is_(None),
    ).update({"consumed_at": now}, synchronize_session=False)

    code = f"{secrets.randbelow(900000) + 100000:06d}"
    destination = student.phone if purpose == "student_phone" else student.guardian_phone
    challenge = StudentVerificationCode(
        student_id=student.id,
        purpose=purpose,
        destination_phone=destination,
        code_hash=_verification_code_hash(student.id, purpose, code),
        expires_at=now + timedelta(seconds=settings.sms_code_ttl_seconds),
        attempts=0,
        created_at=now,
    )
    db.add(challenge)
    db.flush()
    return challenge, code


def _send_verification_sms(student: StudentUser, purpose: str, code: str) -> None:
    expiry_minutes = max(1, settings.sms_code_ttl_seconds // 60)
    if purpose == "student_phone":
        message = f"کد تأیید شماره همراه شما در چکاد: {code} | اعتبار: {expiry_minutes} دقیقه"
        destination = student.phone
    else:
        message = (
            f"برای تأیید شماره و اعلام رضایت سرپرست دانش‌آموز در چکاد، "
            f"کد {code} را وارد کنید. با تأیید کد، رضایت خود را اعلام می‌کنید. "
            f"اعتبار: {expiry_minutes} دقیقه"
        )
        destination = student.guardian_phone
    send_sms(destination, message)


def _require_student_same_origin(request: Request) -> None:
    origin = request.headers.get("origin")
    parsed = urlsplit(origin or "")
    configured = urlsplit(settings.public_site_origin.strip())
    expected = f"{configured.scheme}://{configured.netloc}".lower()
    received = f"{parsed.scheme}://{parsed.netloc}".lower()
    if (
        not origin
        or parsed.scheme not in {"http", "https"}
        or not parsed.netloc
        or parsed.path not in ("", "/")
        or parsed.query
        or parsed.fragment
        or parsed.username
        or parsed.password
        or received != expected
    ):
        raise HTTPException(403, "مبدأ درخواست تأیید معتبر نیست.")


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
        guardian_consent=False,
        guardian_consent_at=None,
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

    try:
        _, phone_code = _create_verification_challenge(db, student, "student_phone")
        _, guardian_code = _create_verification_challenge(db, student, "guardian_consent")
        db.commit()
        _send_verification_sms(student, "student_phone", phone_code)
        _send_verification_sms(student, "guardian_consent", guardian_code)
    except HTTPException:
        db.rollback()
        raise
    except SMSDeliveryError as exc:
        db.rollback()
        raise HTTPException(
            status_code=503,
            detail="حساب ایجاد شد، اما ارسال کد تأیید انجام نشد. وارد حساب شوید و ارسال دوباره را امتحان کنید.",
        ) from exc

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
    if not student.phone_verified or not student.guardian_consent:
        raise HTTPException(403, "برای استفاده از خدمات چکاد، تأیید شماره و رضایت سرپرست را تکمیل کنید.")
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


@app.post("/student/verification/resend")
def resend_student_verification(
    payload: StudentVerificationResendRequest,
    request: Request,
    student: StudentUser = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    _require_student_same_origin(request)
    if payload.purpose == "student_phone" and student.phone_verified:
        raise HTTPException(409, "شماره دانش‌آموز قبلاً تأیید شده است.")
    if payload.purpose == "guardian_consent" and student.guardian_consent:
        raise HTTPException(409, "رضایت سرپرست قبلاً تأیید شده است.")

    try:
        _, code = _create_verification_challenge(db, student, payload.purpose)
        db.commit()
        _send_verification_sms(student, payload.purpose, code)
    except HTTPException:
        db.rollback()
        raise
    except SMSDeliveryError as exc:
        db.rollback()
        raise HTTPException(503, "ارسال پیامک انجام نشد. کمی بعد دوباره تلاش کنید.") from exc

    return {
        "sent": True,
        "purpose": payload.purpose,
        "expires_in": settings.sms_code_ttl_seconds,
        "destination": student.phone if payload.purpose == "student_phone" else student.guardian_phone,
    }


@app.post("/student/verification/confirm")
def confirm_student_verification(
    payload: StudentVerificationConfirmRequest,
    request: Request,
    student: StudentUser = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    _require_student_same_origin(request)
    already_verified = student.phone_verified if payload.purpose == "student_phone" else student.guardian_consent
    if already_verified:
        raise HTTPException(409, "این مرحله قبلاً تأیید شده است.")

    challenge = (
        db.query(StudentVerificationCode)
        .filter(
            StudentVerificationCode.student_id == student.id,
            StudentVerificationCode.purpose == payload.purpose,
            StudentVerificationCode.consumed_at.is_(None),
        )
        .order_by(StudentVerificationCode.created_at.desc(), StudentVerificationCode.id.desc())
        .with_for_update()
        .first()
    )
    if challenge is None:
        raise HTTPException(404, "کد فعالی پیدا نشد. ابتدا کد تازه درخواست کنید.")

    now = datetime.now(timezone.utc)
    expires_at = challenge.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= now:
        challenge.consumed_at = now
        db.commit()
        raise HTTPException(410, "مهلت کد تأیید به پایان رسیده است. کد تازه درخواست کنید.")
    if challenge.attempts >= VERIFICATION_CODE_ATTEMPT_LIMIT:
        raise HTTPException(429, "تعداد تلاش‌های این کد به پایان رسیده است. کد تازه درخواست کنید.")

    expected_hash = _verification_code_hash(student.id, payload.purpose, payload.code)
    if not hmac.compare_digest(challenge.code_hash, expected_hash):
        challenge.attempts += 1
        db.commit()
        if challenge.attempts >= VERIFICATION_CODE_ATTEMPT_LIMIT:
            raise HTTPException(429, "تعداد تلاش‌های این کد به پایان رسیده است. کد تازه درخواست کنید.")
        raise HTTPException(422, "کد تأیید صحیح نیست.")

    challenge.consumed_at = now
    if payload.purpose == "student_phone":
        student.phone_verified = True
    else:
        student.guardian_consent = True
        student.guardian_consent_at = now
    student.updated_at = now
    db.commit()
    db.refresh(student)

    return {
        "student": public_student(student),
        "fully_verified": bool(student.phone_verified and student.guardian_consent),
        "verified_purpose": payload.purpose,
    }


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
    configured = urlsplit(settings.public_site_origin.strip())
    if configured.scheme and configured.netloc:
        expected_origin = f"{configured.scheme}://{configured.netloc}".lower()
    else:
        host = request.headers.get("x-forwarded-host") or request.headers.get("host", "")
        scheme = request.headers.get("x-forwarded-proto") or request.url.scheme
        expected_origin = f"{scheme}://{host}".lower()
    if (
        parsed.scheme not in {"http", "https"}
        or not parsed.netloc
        or parsed.path not in ("", "/")
        or parsed.query or parsed.fragment
        or parsed.username or parsed.password
        or f"{parsed.scheme}://{parsed.netloc}".lower() != expected_origin
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



def public_teacher(teacher: TeacherUser) -> TeacherPublic:
    return TeacherPublic(
        id=teacher.id,
        tutor_profile_id=teacher.tutor_profile_id,
        phone=teacher.phone,
        display_name=teacher.display_name,
    )


def get_current_teacher(request: Request, db: Session = Depends(get_db)) -> TeacherUser:
    token = request.cookies.get(TEACHER_COOKIE_NAME)
    if not token:
        authorization = request.headers.get("authorization", "")
        scheme, _, credentials = authorization.partition(" ")
        if scheme.lower() == "bearer" and credentials:
            token = credentials.strip()
    if not token:
        raise HTTPException(status_code=401, detail="برای ادامه وارد حساب مدرس شوید.")
    try:
        payload = decode_teacher_access_token(token)
        teacher_id = int(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, TypeError, ValueError):
        raise HTTPException(status_code=401, detail="نشست مدرس معتبر نیست؛ دوباره وارد شوید.")
    teacher = db.query(TeacherUser).filter(TeacherUser.id == teacher_id).first()
    if teacher is None or not teacher.is_active:
        raise HTTPException(status_code=401, detail="حساب مدرس فعال نیست.")
    return teacher


def set_teacher_cookie(response: Response, teacher: TeacherUser) -> int:
    token, expires_in = create_teacher_access_token(teacher)
    response.set_cookie(
        key=TEACHER_COOKIE_NAME,
        value=token,
        max_age=expires_in,
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite="lax",
        path="/",
    )
    return expires_in


@app.post("/teacher/login", response_model=TeacherAuthResponse)
def teacher_login(
    payload: TeacherLoginRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    teacher = db.query(TeacherUser).filter(TeacherUser.phone == payload.phone).first()
    valid_password = False
    if teacher is not None:
        try:
            valid_password = bcrypt.checkpw(
                payload.password.encode("utf-8"),
                teacher.password_hash.encode("utf-8"),
            )
        except (ValueError, TypeError):
            valid_password = False
    if teacher is None or not teacher.is_active or not valid_password:
        raise HTTPException(status_code=401, detail="شماره همراه یا رمز عبور صحیح نیست.")
    expires_in = set_teacher_cookie(response, teacher)
    return TeacherAuthResponse(expires_in=expires_in, teacher=public_teacher(teacher))


@app.get("/teacher/me", response_model=TeacherPublic)
def teacher_me(teacher: TeacherUser = Depends(get_current_teacher)):
    return public_teacher(teacher)


@app.post("/teacher/logout")
def teacher_logout(response: Response):
    response.delete_cookie(
        key=TEACHER_COOKIE_NAME,
        path="/",
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite="lax",
    )
    return {"message": "خروج از حساب مدرس انجام شد"}


@app.get("/admin/teacher-accounts")
def list_teacher_accounts(
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_admin),
):
    rows = db.query(TeacherUser).order_by(TeacherUser.id.desc()).all()
    return {
        "items": [
            {
                "id": row.id,
                "tutor_profile_id": row.tutor_profile_id,
                "phone": row.phone,
                "display_name": row.display_name,
                "is_active": row.is_active,
                "created_at": row.created_at,
            }
            for row in rows
        ],
        "total": len(rows),
    }


@app.post("/admin/teacher-accounts", status_code=201)
async def create_teacher_account(
    payload: TeacherAccountCreate,
    request: Request,
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_admin),
):
    require_admin_same_origin(request)
    existing = db.query(TeacherUser).filter(
        (TeacherUser.phone == payload.phone)
        | (TeacherUser.tutor_profile_id == payload.tutor_profile_id)
    ).first()
    if existing is not None:
        raise HTTPException(409, "برای این شماره همراه یا پروفایل مدرس قبلاً حساب ساخته شده است.")
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            response = await client.get(
                settings.people_internal_url.rstrip("/") + f"/tutors/{payload.tutor_profile_id}"
            )
    except httpx.RequestError as exc:
        raise HTTPException(503, "سرویس پروفایل مدرسان در دسترس نیست.") from exc
    if response.status_code == 404:
        raise HTTPException(404, "پروفایل عمومی مدرس پیدا نشد.")
    if response.status_code != 200:
        raise HTTPException(503, "بررسی پروفایل مدرس انجام نشد.")
    try:
        profile = response.json()
    except ValueError as exc:
        raise HTTPException(503, "پاسخ سرویس پروفایل معتبر نیست.") from exc
    if (
        not isinstance(profile, dict)
        or profile.get("id") != payload.tutor_profile_id
        or profile.get("status") != "active"
        or profile.get("is_public") is not True
    ):
        raise HTTPException(422, "فقط برای پروفایل عمومی و فعال مدرس می‌توان حساب ساخت.")
    teacher = TeacherUser(
        tutor_profile_id=payload.tutor_profile_id,
        phone=payload.phone,
        display_name=payload.display_name,
        password_hash=bcrypt.hashpw(
            payload.password.encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8"),
        is_active=True,
    )
    db.add(teacher)
    try:
        db.commit()
        db.refresh(teacher)
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "حساب مدرس با این مشخصات قبلاً ایجاد شده است.")
    return {
        "id": teacher.id,
        "tutor_profile_id": teacher.tutor_profile_id,
        "phone": teacher.phone,
        "display_name": teacher.display_name,
        "is_active": teacher.is_active,
        "created_at": teacher.created_at,
    }


@app.patch("/admin/teacher-accounts/{account_id}")
def update_teacher_account_status(
    account_id: int,
    is_active: bool,
    request: Request,
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_admin),
):
    require_admin_same_origin(request)
    teacher = db.get(TeacherUser, account_id)
    if teacher is None:
        raise HTTPException(404, "حساب مدرس پیدا نشد.")
    teacher.is_active = is_active
    teacher.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"id": teacher.id, "is_active": teacher.is_active}
