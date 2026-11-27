import re
from datetime import datetime, timezone
from urllib.parse import urlsplit

import httpx
from fastapi import Depends, FastAPI, HTTPException, Request, status
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.config import settings
from app.db import engine, get_db
from app import models
from app.schemas import (
    MentorshipApplicationCreate,
    PublicApplicationCreated,
    TutoringApplicationCreate,
)

app = FastAPI(
    title=f"Chekad {settings.service_name}",
    version="0.3.0",
    description="Public application intake for Chekad mentorship and tutoring.",
)

PRIVACY_NOTICE_VERSION = "2026-11-27-v1"


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def require_public_intake() -> None:
    """Fail closed until the privacy contact and explicit activation are configured."""
    email = settings.privacy_contact_email.strip()
    configured_origin = urlsplit(settings.public_site_origin.strip())
    origin_is_secure = (
        configured_origin.scheme == "https"
        and bool(configured_origin.netloc)
        and configured_origin.path in ("", "/")
        and not configured_origin.query
        and not configured_origin.fragment
        and not configured_origin.username
        and not configured_origin.password
    )
    if (
        not settings.public_applications_enabled
        or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email)
        or not origin_is_secure
    ):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ثبت درخواست هنوز توسط چکاد فعال نشده است.",
        )


def require_same_origin(request: Request) -> None:
    """Reject browser form submissions originating from another website.

    The Gateway must overwrite X-Forwarded-Host and X-Forwarded-Proto.
    Set PUBLIC_SITE_ORIGIN to the canonical HTTPS origin in production.
    """
    origin = request.headers.get("origin")
    if not origin or origin == "null":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="درخواست از مبدأ معتبر ارسال نشده است.",
        )

    configured_origin = settings.public_site_origin.strip().rstrip("/")
    parsed_origin = urlsplit(origin)
    normalized_origin = f"{parsed_origin.scheme}://{parsed_origin.netloc}".rstrip("/")

    if (
        parsed_origin.scheme != "https"
        or not parsed_origin.netloc
        or parsed_origin.path not in ("", "/")
        or parsed_origin.query
        or parsed_origin.fragment
        or parsed_origin.username
        or parsed_origin.password
        or normalized_origin.lower() != configured_origin.lower()
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="مبدأ درخواست با وب‌سایت چکاد مطابقت ندارد.",
        )


async def require_admin(request: Request) -> dict:
    """Delegate admin-session validation to the auth-service."""
    headers: dict[str, str] = {}
    cookie = request.headers.get("cookie")
    authorization = request.headers.get("authorization")

    if cookie:
        headers["Cookie"] = cookie
    if authorization:
        headers["Authorization"] = authorization
    if not cookie and not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="احراز هویت مدیر لازم است.",
        )

    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            response = await client.get(
                f"{settings.auth_internal_url.rstrip('/')}/me",
                headers=headers,
            )
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="سرویس احراز هویت در دسترس نیست.",
        ) from exc

    if response.status_code != status.HTTP_200_OK:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="نشست مدیر معتبر نیست.",
        )

    try:
        admin = response.json()
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="پاسخ سرویس احراز هویت معتبر نیست.",
        ) from exc

    if not isinstance(admin, dict) or not isinstance(admin.get("id"), int):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="پاسخ سرویس احراز هویت معتبر نیست.",
        )
    return admin


def compose_notes(*items: tuple[str, str | None]) -> str | None:
    lines = [f"{label}: {value}" for label, value in items if value]
    return "\n".join(lines)[:2000] if lines else None


def create_student(
    db: Session,
    *,
    first_name: str,
    last_name: str,
    grade: str,
    field: str,
    guardian_phone: str,
) -> models.Student:
    student = models.Student(
        first_name=first_name,
        last_name=last_name,
        phone=None,
        email=None,
        grade=grade,
        field=field,
        parent_phone=guardian_phone,
    )
    db.add(student)
    db.flush()
    return student


def commit_or_unavailable(db: Session) -> None:
    try:
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        # Do not expose SQL, database values, or connection details to callers.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ثبت درخواست در حال حاضر ممکن نیست. لطفاً کمی بعد دوباره تلاش کنید.",
        ) from exc


@app.get("/health")
def health():
    db_status = "ok"
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except Exception as exc:
        db_status = f"error:{exc.__class__.__name__}"
    return {"status": "ok", "service": settings.service_name, "db": db_status}


@app.post(
    "/mentorship-applications",
    response_model=PublicApplicationCreated,
    status_code=status.HTTP_201_CREATED,
)
def create_mentorship_application(
    payload: MentorshipApplicationCreate,
    db: Session = Depends(get_db),
    _: None = Depends(require_public_intake),
    __: None = Depends(require_same_origin),
):
    try:
        student = create_student(
            db,
            first_name=payload.first_name,
            last_name=payload.last_name,
            grade=payload.grade,
            field=payload.field,
            guardian_phone=payload.guardian_phone,
        )
        application = models.MentorshipApplication(
            student_id=student.id,
            field=payload.field,
            status="new",
            student_note=compose_notes(
                ("سطح فعلی", payload.level),
                ("هدف", payload.goal),
                ("توضیحات", payload.notes),
            ),
            guardian_consent_at=utcnow(),
            privacy_accepted_at=utcnow(),
            privacy_notice_version=PRIVACY_NOTICE_VERSION,
        )
        db.add(application)
        db.flush()
        request_id = application.id
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ثبت درخواست در حال حاضر ممکن نیست. لطفاً کمی بعد دوباره تلاش کنید.",
        ) from exc

    commit_or_unavailable(db)
    return PublicApplicationCreated(
        request_id=request_id,
        message="درخواست منتورینگ شما دریافت شد. کد پیگیری را نگه دارید.",
    )


@app.post(
    "/tutoring-applications",
    response_model=PublicApplicationCreated,
    status_code=status.HTTP_201_CREATED,
)
def create_tutoring_application(
    payload: TutoringApplicationCreate,
    db: Session = Depends(get_db),
    _: None = Depends(require_public_intake),
    __: None = Depends(require_same_origin),
):
    try:
        student = create_student(
            db,
            first_name=payload.first_name,
            last_name=payload.last_name,
            grade=payload.grade,
            field=payload.field,
            guardian_phone=payload.guardian_phone,
        )
        application = models.TutoringApplication(
            student_id=student.id,
            field=payload.field,
            topic=payload.topic,
            description=compose_notes(
                ("هدف", payload.goal),
                ("توضیحات", payload.notes),
            ),
            status="new",
            guardian_consent_at=utcnow(),
            privacy_accepted_at=utcnow(),
            privacy_notice_version=PRIVACY_NOTICE_VERSION,
        )
        db.add(application)
        db.flush()
        request_id = application.id
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ثبت درخواست در حال حاضر ممکن نیست. لطفاً کمی بعد دوباره تلاش کنید.",
        ) from exc

    commit_or_unavailable(db)
    return PublicApplicationCreated(
        request_id=request_id,
        message="درخواست کلاس خصوصی شما دریافت شد. کد پیگیری را نگه دارید.",
    )


@app.get("/admin/stats")
async def stats(
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    return {
        "students": db.query(models.Student).count(),
        "mentorship_applications": db.query(models.MentorshipApplication).count(),
        "tutoring_applications": db.query(models.TutoringApplication).count(),
        "mentorship_packages": db.query(models.MentorshipPackage).count(),
        "mentor_assignments": db.query(models.MentorAssignment).count(),
        "tutor_assignments": db.query(models.TutorAssignment).count(),
    }
