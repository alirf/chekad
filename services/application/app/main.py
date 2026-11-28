import asyncio
import hashlib
import json
import re
from uuid import uuid4
from datetime import datetime, timedelta, timezone
from urllib.parse import urlsplit

import httpx
from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request, Response, WebSocket, WebSocketDisconnect, status
from sqlalchemy import or_, text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session, joinedload

from app.config import settings
from app.db import engine, get_db
from app import models
from app.schemas import (
    AdminApplicationStatusUpdate,
    AdminAssignmentCreate,
    AdminAssignmentStatusUpdate,
    AdminInvoiceStatusUpdate,
    StudentInvoiceCreate,
    InternalNoteCreate,
    MentorshipApplicationCreate,
    MentorWeeklyReportCreate,
    PublicApplicationCreated,
    StudentMessageCreate,
    StudentMessageThreadCreate,
    StudentStudyReportCreate,
    StudentActivityCreate,
    ManagedStudyTaskCreate,
    ManagedStudyTaskUpdate,
    StudentAssignedTaskStatus,
    TutoringApplicationCreate,
)

app = FastAPI(
    title=f"Chekad {settings.service_name}",
    version="0.7.0",
    description="Student portal, mentor and teacher communication, weekly plans, scheduling and billing.",
)
PRIVACY_NOTICE_VERSION = "2026-11-28-v3"
APPLICATION_STATUSES = {
    "new", "reviewing", "waiting_for_student", "options_proposed",
    "accepted", "active", "completed", "rejected", "cancelled",
}


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _notify_student(db: Session, student_auth_id: int | None, category: str, title: str,
                    body: str, href: str, dedupe_key: str) -> None:
    """Add a student notification to the source event's transaction."""
    if student_auth_id is None:
        return
    if db.query(models.StudentNotification.id).filter_by(dedupe_key=dedupe_key).first():
        return
    db.add(models.StudentNotification(
        student_auth_id=student_auth_id, category=category, title=title[:180],
        body=body[:700], href=href[:240], dedupe_key=dedupe_key[:190],
    ))


def _student_notification_payload(row: models.StudentNotification) -> dict:
    return {
        "id": row.id, "category": row.category, "title": row.title,
        "body": row.body, "href": row.href, "created_at": row.created_at,
        "read_at": row.read_at,
    }


def require_public_intake() -> None:
    email = settings.privacy_contact_email.strip()
    phone = re.sub(r"[\s()-]", "", settings.privacy_contact_phone.strip())
    telegram = settings.privacy_contact_telegram.strip().removeprefix("@")
    has_privacy_contact = (
        bool(re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email))
        or bool(re.fullmatch(r"(?:\+98|0)?9\d{9}", phone))
        or bool(re.fullmatch(r"[A-Za-z0-9_]{5,32}", telegram))
    )
    origin = urlsplit(settings.public_site_origin.strip())
    valid_shape = (
        bool(origin.hostname)
        and origin.path in ("", "/")
        and not origin.query
        and not origin.fragment
        and not origin.username
        and not origin.password
    )
    secure_origin = valid_shape and origin.scheme == "https"
    local_development_origin = (
        valid_shape
        and settings.app_env.lower() != "production"
        and origin.scheme == "http"
        and origin.hostname in {"localhost", "127.0.0.1"}
    )
    if (
        not settings.public_applications_enabled
        or not settings.terms_approved
        or not has_privacy_contact
        or not (secure_origin or local_development_origin)
    ):
        raise HTTPException(
            status_code=503,
            detail="ثبت درخواست در حال حاضر در دسترس نیست. لطفاً از راه‌های ارتباطی چکاد پیگیری کنید.",
        )


def require_same_origin(request: Request) -> None:
    origin = request.headers.get("origin")
    if not origin or origin == "null":
        raise HTTPException(403, "درخواست از مبدأ معتبر ارسال نشده است.")
    parsed = urlsplit(origin)
    if (
        not parsed.netloc or parsed.path not in ("", "/") or parsed.query or parsed.fragment
        or parsed.username or parsed.password
    ):
        raise HTTPException(403, "مبدأ درخواست معتبر نیست.")

    configured = urlsplit(settings.public_site_origin.strip())
    if configured.scheme and configured.netloc:
        expected = f"{configured.scheme}://{configured.netloc}".lower()
        received = f"{parsed.scheme}://{parsed.netloc}".lower()
        matches = received == expected
    else:
        host = request.headers.get("x-forwarded-host") or request.headers.get("host", "")
        proto = request.headers.get("x-forwarded-proto") or request.url.scheme
        matches = parsed.netloc.lower() == host.lower() and parsed.scheme.lower() == proto.lower()

    if not matches:
        raise HTTPException(403, "مبدأ درخواست با وب‌سایت چکاد مطابقت ندارد.")


async def require_admin(request: Request) -> dict:
    headers = {}
    if request.headers.get("cookie"):
        headers["Cookie"] = request.headers["cookie"]
    if request.headers.get("authorization"):
        headers["Authorization"] = request.headers["authorization"]
    if not headers:
        raise HTTPException(401, "احراز هویت مدیر لازم است.")
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            response = await client.get(
                settings.auth_internal_url.rstrip("/") + "/me",
                headers=headers,
            )
    except httpx.RequestError as exc:
        raise HTTPException(503, "سرویس احراز هویت در دسترس نیست.") from exc
    if response.status_code != 200:
        raise HTTPException(401, "نشست مدیر معتبر نیست.")
    try:
        admin = response.json()
    except ValueError as exc:
        raise HTTPException(503, "پاسخ سرویس احراز هویت معتبر نیست.") from exc
    if not isinstance(admin, dict) or not isinstance(admin.get("id"), int):
        raise HTTPException(503, "پاسخ سرویس احراز هویت معتبر نیست.")
    return admin


async def require_student(request: Request) -> dict:
    headers = {}
    if request.headers.get("cookie"):
        headers["Cookie"] = request.headers["cookie"]
    if request.headers.get("authorization"):
        headers["Authorization"] = request.headers["authorization"]
    if not headers:
        raise HTTPException(401, "برای ثبت و پیگیری درخواست وارد حساب دانش‌آموزی شوید.")

    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            response = await client.get(
                settings.auth_internal_url.rstrip("/") + "/student/me",
                headers=headers,
            )
    except httpx.RequestError as exc:
        raise HTTPException(503, "سرویس احراز هویت در دسترس نیست.") from exc

    if response.status_code == 401:
        raise HTTPException(401, "نشست دانش‌آموزی معتبر نیست؛ دوباره وارد شوید.")
    if response.status_code != 200:
        raise HTTPException(503, "اعتبارسنجی حساب دانش‌آموزی انجام نشد.")

    try:
        student = response.json()
    except ValueError as exc:
        raise HTTPException(503, "پاسخ سرویس احراز هویت معتبر نیست.") from exc

    required = ("id", "first_name", "last_name", "grade", "field", "guardian_phone")
    if (
        not isinstance(student, dict)
        or not isinstance(student.get("id"), int)
        or any(not isinstance(student.get(key), str) or not student[key].strip() for key in required[1:])
    ):
        raise HTTPException(503, "اطلاعات حساب دانش‌آموزی کامل نیست.")
    if student["field"] not in ("physics", "computer"):
        raise HTTPException(503, "رشته المپیاد حساب معتبر نیست.")
    return student


async def require_mentor(request: Request) -> dict:
    headers = {}
    if request.headers.get("cookie"):
        headers["Cookie"] = request.headers["cookie"]
    if request.headers.get("authorization"):
        headers["Authorization"] = request.headers["authorization"]
    if not headers:
        raise HTTPException(401, "برای ادامه وارد حساب مشاور شوید.")
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            response = await client.get(
                settings.auth_internal_url.rstrip("/") + "/mentor/me",
                headers=headers,
            )
    except httpx.RequestError as exc:
        raise HTTPException(503, "سرویس احراز هویت مشاور در دسترس نیست.") from exc
    if response.status_code == 401:
        raise HTTPException(401, "نشست مشاور معتبر نیست؛ دوباره وارد شوید.")
    if response.status_code != 200:
        raise HTTPException(503, "اعتبارسنجی حساب مشاور انجام نشد.")
    try:
        mentor = response.json()
    except ValueError as exc:
        raise HTTPException(503, "پاسخ سرویس احراز هویت معتبر نیست.") from exc
    if (
        not isinstance(mentor, dict)
        or not isinstance(mentor.get("id"), int)
        or not isinstance(mentor.get("mentor_profile_id"), int)
        or not isinstance(mentor.get("display_name"), str)
    ):
        raise HTTPException(503, "اطلاعات حساب مشاور کامل نیست.")
    return mentor


async def fetch_public_person(kind: str, person_id: int) -> dict:
    resource = "mentors" if kind == "mentorship" else "tutors"
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            response = await client.get(
                settings.people_internal_url.rstrip("/") + f"/{resource}/{person_id}"
            )
    except httpx.RequestError as exc:
        raise HTTPException(503, "سرویس پروفایل مدرس یا منتور در دسترس نیست.") from exc
    if response.status_code == 404:
        raise HTTPException(404, "پروفایل عمومی مدرس یا منتور پیدا نشد.")
    if response.status_code != 200:
        raise HTTPException(503, "بررسی پروفایل مدرس یا منتور انجام نشد.")
    try:
        person = response.json()
    except ValueError as exc:
        raise HTTPException(503, "پاسخ سرویس پروفایل معتبر نیست.") from exc
    if (
        not isinstance(person, dict)
        or person.get("id") != person_id
        or person.get("status") != "active"
        or person.get("is_public") is not True
        or person.get("field") not in ("physics", "computer")
    ):
        raise HTTPException(422, "فقط پروفایل عمومی و فعال همان رشته قابل تخصیص است.")
    return person


def compose_notes(*items: tuple[str, str | None]) -> str | None:
    lines = [f"{label}: {value}" for label, value in items if value]
    return "\n".join(lines)[:2000] if lines else None


def _normalized_mobile_tail(value: str) -> str:
    digits = re.sub(r"\D", "", value)
    return digits[-10:]


def create_student(db: Session, payload, authenticated_student: dict) -> models.Student:
    if payload.grade != authenticated_student["grade"] or payload.field != authenticated_student["field"]:
        raise HTTPException(
            422,
            "پایه یا رشته فرم با اطلاعات حساب دانش‌آموزی مطابقت ندارد.",
        )

    if _normalized_mobile_tail(payload.guardian_phone) != _normalized_mobile_tail(authenticated_student["guardian_phone"]):
        raise HTTPException(
            422,
            "شماره ولی یا سرپرست با شماره ثبت‌شده در حساب دانش‌آموزی مطابقت ندارد.",
        )

    student = (
        db.query(models.Student)
        .filter_by(auth_student_id=authenticated_student["id"])
        .first()
    )
    if student is None:
        student = models.Student(
            auth_student_id=authenticated_student["id"],
            phone=None,
            email=None,
        )
        db.add(student)

    # Authentication data is authoritative; form values cannot change account identity.
    student.first_name = authenticated_student["first_name"]
    student.last_name = authenticated_student["last_name"]
    student.grade = authenticated_student["grade"]
    student.field = authenticated_student["field"]
    student.parent_phone = payload.guardian_phone
    db.flush()
    return student


def _fingerprint(payload) -> str:
    canonical = json.dumps(
        payload.model_dump(mode="json"),
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _create_public_application(
    db: Session,
    payload,
    kind: str,
    key: str | None,
    response: Response,
    authenticated_student: dict,
) -> int:
    if key is not None and not re.fullmatch(r"[A-Za-z0-9._:-]{16,64}", key):
        raise HTTPException(422, "کلید جلوگیری از ثبت تکراری معتبر نیست.")

    model = models.MentorshipApplication if kind == "mentorship" else models.TutoringApplication
    fingerprint = _fingerprint(payload)

    if key:
        existing = db.query(model).filter_by(idempotency_key=key).first()
        if existing:
            if existing.student.auth_student_id != authenticated_student["id"]:
                raise HTTPException(409, "این کلید قبلاً برای حساب دیگری استفاده شده است.")
            if existing.request_fingerprint != fingerprint:
                raise HTTPException(409, "این کلید قبلاً برای اطلاعات دیگری استفاده شده است.")
            response.status_code = 200
            return existing.id

    try:
        student = create_student(db, payload, authenticated_student)
        common = {
            "student_id": student.id,
            "field": student.field,
            "status": "new",
            "guardian_consent_at": utcnow(),
            "privacy_accepted_at": utcnow(),
            "privacy_notice_version": PRIVACY_NOTICE_VERSION,
            "idempotency_key": key,
            "request_fingerprint": fingerprint if key else None,
        }
        if kind == "mentorship":
            application = models.MentorshipApplication(
                **common,
                student_note=compose_notes(
                    ("سطح فعلی", payload.level),
                    ("هدف", payload.goal),
                    ("توضیحات", payload.notes),
                ),
            )
        else:
            application = models.TutoringApplication(
                **common,
                topic=payload.topic,
                description=compose_notes(("هدف", payload.goal), ("توضیحات", payload.notes)),
            )
        db.add(application)
        db.commit()
        db.refresh(application)
        return application.id
    except IntegrityError as exc:
        db.rollback()
        if key:
            existing = db.query(model).filter_by(idempotency_key=key).first()
            if existing and existing.student.auth_student_id == authenticated_student["id"] and existing.request_fingerprint == fingerprint:
                response.status_code = 200
                return existing.id
            if existing:
                raise HTTPException(409, "این کلید قبلاً برای حساب یا اطلاعات دیگری استفاده شده است.") from exc
        raise HTTPException(503, "ثبت درخواست در حال حاضر ممکن نیست. لطفاً کمی بعد تلاش کنید.") from exc
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(503, "ثبت درخواست در حال حاضر ممکن نیست. لطفاً کمی بعد تلاش کنید.") from exc


def _model_for(kind: str):
    if kind == "mentorship":
        return models.MentorshipApplication
    if kind == "tutoring":
        return models.TutoringApplication
    raise HTTPException(404, "درخواست پیدا نشد.")


def _serialize_application(row, kind: str) -> dict:
    return {
        "id": row.id,
        "kind": kind,
        "tracking_code": f"CH-{row.id:06d}",
        "field": row.field,
        "status": row.status,
        "created_at": row.created_at,
        "updated_at": row.updated_at,
        "student": {
            "id": row.student.id,
            "first_name": row.student.first_name,
            "last_name": row.student.last_name,
            "grade": row.student.grade,
            "guardian_phone": row.student.parent_phone,
        },
        "topic": getattr(row, "topic", None),
        "student_note": getattr(row, "student_note", None),
        "description": getattr(row, "description", None),
        "admin_note": row.admin_note,
        "reject_reason": row.reject_reason,
    }


@app.get("/health/live")
def health_live():
    return {"status": "ok", "service": settings.service_name}


@app.get("/health/ready")
@app.get("/health")
def health_ready():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except Exception as exc:
        raise HTTPException(
            503,
            detail={"status": "not_ready", "service": settings.service_name, "dependency": "database"},
        ) from exc
    return {"status": "ok", "service": settings.service_name, "db": "ok"}


@app.post("/mentorship-applications", response_model=PublicApplicationCreated, status_code=201)
def create_mentorship_application(
    payload: MentorshipApplicationCreate,
    response: Response,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    _: None = Depends(require_public_intake),
    __: None = Depends(require_same_origin),
    student: dict = Depends(require_student),
    db: Session = Depends(get_db),
):
    request_id = _create_public_application(
        db, payload, "mentorship", idempotency_key, response, student
    )
    return PublicApplicationCreated(
        request_id=request_id,
        message="درخواست منتورینگ شما دریافت شد. کد پیگیری را نگه دارید.",
    )


@app.post("/tutoring-applications", response_model=PublicApplicationCreated, status_code=201)
def create_tutoring_application(
    payload: TutoringApplicationCreate,
    response: Response,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    _: None = Depends(require_public_intake),
    __: None = Depends(require_same_origin),
    student: dict = Depends(require_student),
    db: Session = Depends(get_db),
):
    request_id = _create_public_application(
        db, payload, "tutoring", idempotency_key, response, student
    )
    return PublicApplicationCreated(
        request_id=request_id,
        message="درخواست کلاس خصوصی شما دریافت شد. کد پیگیری را نگه دارید.",
    )


@app.get("/student/applications")
def student_applications(
    student: dict = Depends(require_student),
    db: Session = Depends(get_db),
):
    profile = (
        db.query(models.Student)
        .filter_by(auth_student_id=student["id"])
        .first()
    )
    if profile is None:
        return {"items": [], "total": 0}

    items = []
    mentorship_rows = (
        db.query(models.MentorshipApplication)
        .filter_by(student_id=profile.id)
        .order_by(models.MentorshipApplication.created_at.desc(), models.MentorshipApplication.id.desc())
        .all()
    )
    tutoring_rows = (
        db.query(models.TutoringApplication)
        .filter_by(student_id=profile.id)
        .order_by(models.TutoringApplication.created_at.desc(), models.TutoringApplication.id.desc())
        .all()
    )

    for row in mentorship_rows:
        items.append({
            "id": row.id,
            "kind": "mentorship",
            "tracking_code": f"CH-{row.id:06d}",
            "title": "درخواست منتورینگ",
            "field": row.field,
            "status": row.status,
            "created_at": row.created_at,
            "updated_at": row.updated_at,
            "details": row.student_note,
        })
    for row in tutoring_rows:
        items.append({
            "id": row.id,
            "kind": "tutoring",
            "tracking_code": f"CH-{row.id:06d}",
            "title": "درخواست کلاس خصوصی",
            "field": row.field,
            "status": row.status,
            "created_at": row.created_at,
            "updated_at": row.updated_at,
            "details": compose_notes(
                ("موضوع", row.topic),
                ("توضیحات", row.description),
            ),
        })

    items.sort(key=lambda item: (item["created_at"], item["id"]), reverse=True)
    return {"items": items, "total": len(items)}


@app.get("/student/notifications")
def student_notifications(
    limit: int = Query(default=50, ge=1, le=100),
    student: dict = Depends(require_student),
    db: Session = Depends(get_db),
):
    query = db.query(models.StudentNotification).filter_by(student_auth_id=student["id"])
    total = query.count()
    unread_count = query.filter(models.StudentNotification.read_at.is_(None)).count()
    rows = query.order_by(models.StudentNotification.created_at.desc(), models.StudentNotification.id.desc()).limit(limit).all()
    return {"items": [_student_notification_payload(row) for row in rows], "total": total, "unread_count": unread_count}


@app.patch("/student/notifications/{notification_id}/read")
def mark_student_notification_read(
    notification_id: int,
    request: Request,
    student: dict = Depends(require_student),
    db: Session = Depends(get_db),
):
    require_portal_same_origin(request)
    row = db.query(models.StudentNotification).filter_by(id=notification_id, student_auth_id=student["id"]).first()
    if row is None:
        raise HTTPException(404, "اعلان پیدا نشد.")
    if row.read_at is None:
        row.read_at = utcnow()
        db.commit()
        db.refresh(row)
    return _student_notification_payload(row)


@app.post("/student/notifications/read-all")
def mark_all_student_notifications_read(
    request: Request,
    student: dict = Depends(require_student),
    db: Session = Depends(get_db),
):
    require_portal_same_origin(request)
    rows = db.query(models.StudentNotification).filter(
        models.StudentNotification.student_auth_id == student["id"],
        models.StudentNotification.read_at.is_(None),
    ).all()
    now = utcnow()
    for row in rows:
        row.read_at = now
    db.commit()
    return {"updated": len(rows)}


@app.post("/student/activities")
def record_student_activity(
    payload: StudentActivityCreate,
    request: Request,
    student: dict = Depends(require_student),
    db: Session = Depends(get_db),
):
    require_portal_same_origin(request)
    today = utcnow().date()
    exists = db.query(models.StudentActivity.id).filter_by(
        student_auth_id=student["id"], event_type=payload.event_type, activity_date=today,
    ).first()
    if exists:
        return {"recorded": True, "deduplicated": True}
    db.add(models.StudentActivity(student_auth_id=student["id"], event_type=payload.event_type, activity_date=today))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(503, "ثبت رویداد فعالیت انجام نشد.") from exc
    return {"recorded": True, "deduplicated": False}


@app.get("/admin/retention")
def admin_retention(
    days: int = Query(default=30, ge=7, le=180),
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    """Cohort retention, using distinct UTC dates with an authenticated student session."""
    today = utcnow().date()
    start_date = today - timedelta(days=days - 1)
    rows = db.query(models.StudentActivity.student_auth_id, models.StudentActivity.activity_date).filter(
        models.StudentActivity.event_type == "session_started"
    ).order_by(models.StudentActivity.activity_date.asc()).all()
    dates_by_student: dict[int, set] = {}
    first_seen: dict[int, object] = {}
    for student_id, activity_date in rows:
        dates_by_student.setdefault(student_id, set()).add(activity_date)
        if student_id not in first_seen or activity_date < first_seen[student_id]:
            first_seen[student_id] = activity_date
    cohorts: dict[object, list[int]] = {}
    for student_id, cohort_date in first_seen.items():
        if cohort_date >= start_date:
            cohorts.setdefault(cohort_date, []).append(student_id)
    cohort_items = []
    for offset in range(days):
        cohort_date = start_date + timedelta(days=offset)
        student_ids = cohorts.get(cohort_date, [])
        size = len(student_ids)
        def retained(day_offset: int):
            target = cohort_date + timedelta(days=day_offset)
            if target > today:
                return None, None
            count = sum(target in dates_by_student.get(student_id, set()) for student_id in student_ids)
            return count, round(count * 100 / size, 1) if size else 0.0
        d1_count, d1_rate = retained(1)
        d7_count, d7_rate = retained(7)
        d30_count, d30_rate = retained(30)
        cohort_items.append({
            "cohort_date": cohort_date.isoformat(), "students": size,
            "d1_retained": d1_count, "d1_rate": d1_rate,
            "d7_retained": d7_count, "d7_rate": d7_rate,
            "d30_retained": d30_count, "d30_rate": d30_rate,
        })
    active7 = {sid for sid, dates in dates_by_student.items() if any(d >= today - timedelta(days=6) for d in dates)}
    active30 = {sid for sid, dates in dates_by_student.items() if any(d >= today - timedelta(days=29) for d in dates)}
    returning7 = sum(sum(d >= today - timedelta(days=6) for d in dates_by_student[sid]) >= 2 for sid in active7)
    return {
        "period_days": days, "tracked_students": len(first_seen),
        "active_students_7d": len(active7), "active_students_30d": len(active30),
        "returning_students_7d": returning7, "cohorts": cohort_items,
        "retention_basis": "unique UTC dates with an authenticated student portal session",
    }


@app.get("/admin/stats")
def stats(db: Session = Depends(get_db), _: dict = Depends(require_admin)):
    return {
        "students": db.query(models.Student).count(),
        "mentorship_applications": db.query(models.MentorshipApplication).count(),
        "tutoring_applications": db.query(models.TutoringApplication).count(),
        "mentorship_packages": db.query(models.MentorshipPackage).count(),
        "mentor_assignments": db.query(models.MentorAssignment).count(),
        "tutor_assignments": db.query(models.TutorAssignment).count(),
    }


@app.get("/admin/applications")
def admin_applications(
    kind: str = Query(default="all", pattern="^(all|mentorship|tutoring)$"),
    application_status: str | None = Query(default=None, alias="status"),
    field: str | None = Query(default=None, pattern="^(physics|computer)$"),
    q: str | None = Query(default=None, max_length=100),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    if application_status is not None and application_status not in APPLICATION_STATUSES:
        raise HTTPException(422, "وضعیت درخواست معتبر نیست.")

    collected = []
    total = 0
    targets = []
    if kind in ("all", "mentorship"):
        targets.append(("mentorship", models.MentorshipApplication))
    if kind in ("all", "tutoring"):
        targets.append(("tutoring", models.TutoringApplication))

    for application_kind, model in targets:
        query = db.query(model).options(joinedload(model.student))
        if application_status:
            query = query.filter(model.status == application_status)
        if field:
            query = query.filter(model.field == field)
        if q:
            pattern = f"%{q.strip()}%"
            query = query.join(models.Student).filter(or_(
                models.Student.first_name.ilike(pattern),
                models.Student.last_name.ilike(pattern),
                models.Student.parent_phone.ilike(pattern),
            ))
        total += query.count()
        for row in query.order_by(model.created_at.desc(), model.id.desc()).limit(limit + offset).all():
            collected.append(_serialize_application(row, application_kind))

    collected.sort(key=lambda item: (item["created_at"], item["id"]), reverse=True)
    return {"items": collected[offset:offset + limit], "total": total, "limit": limit, "offset": offset}


@app.get("/admin/applications/{kind}/{application_id}")
def admin_application_detail(
    kind: str,
    application_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    model = _model_for(kind)
    row = db.query(model).options(joinedload(model.student)).filter_by(id=application_id).first()
    if row is None:
        raise HTTPException(404, "درخواست پیدا نشد.")
    result = _serialize_application(row, kind)
    notes = db.query(models.InternalNote).filter_by(
        application_type=kind, application_id=application_id
    ).order_by(models.InternalNote.created_at.desc(), models.InternalNote.id.desc()).all()
    result["internal_notes"] = [
        {"id": n.id, "admin_id": n.admin_id, "content": n.content, "created_at": n.created_at}
        for n in notes
    ]
    return result


@app.patch("/admin/applications/{kind}/{application_id}")
def update_application_status(
    kind: str,
    application_id: int,
    payload: AdminApplicationStatusUpdate,
    request: Request,
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    require_same_origin(request)
    row = db.get(_model_for(kind), application_id)
    if row is None:
        raise HTTPException(404, "درخواست پیدا نشد.")
    previous_status = row.status
    row.status = payload.status
    if payload.status == "rejected":
        row.reject_reason = payload.reject_reason
    elif payload.reject_reason is not None:
        raise HTTPException(422, "دلیل رد فقط برای وضعیت ردشده قابل ثبت است.")
    if previous_status != row.status:
        labels = {"new": "ثبت‌شده", "reviewing": "در حال بررسی", "waiting_for_student": "منتظر پاسخ شما",
                  "options_proposed": "پیشنهادها آماده انتخاب", "accepted": "پذیرفته‌شده",
                  "active": "در حال اجرا", "completed": "تکمیل‌شده", "rejected": "ردشده", "cancelled": "لغوشده"}
        profile = db.get(models.Student, row.student_id)
        if profile is not None:
            service = "منتورینگ" if kind == "mentorship" else "کلاس خصوصی"
            prompt = "برای ادامه مسیر، پیام‌های پنل را بررسی کن." if row.status in {"waiting_for_student", "options_proposed"} else "وضعیت جدید را در بخش درخواست‌های من ببین."
            _notify_student(db, profile.auth_student_id, "application", "به‌روزرسانی درخواست " + service,
                            "وضعیت درخواستت به «" + labels.get(row.status, row.status) + "» تغییر کرد. " + prompt,
                            "/dashboard", f"application:{kind}:{row.id}:{row.status}:{uuid4().hex}")
    try:
        db.commit()
        db.refresh(row)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(503, "به‌روزرسانی درخواست انجام نشد.") from exc
    return {"id": row.id, "kind": kind, "status": row.status, "updated_at": row.updated_at, "updated_by": admin["id"]}


@app.post("/admin/applications/{kind}/{application_id}/notes", status_code=201)
def add_internal_note(
    kind: str,
    application_id: int,
    payload: InternalNoteCreate,
    request: Request,
    db: Session = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    require_same_origin(request)
    if db.get(_model_for(kind), application_id) is None:
        raise HTTPException(404, "درخواست پیدا نشد.")
    note = models.InternalNote(
        application_type=kind,
        application_id=application_id,
        admin_id=admin["id"],
        content=payload.content,
    )
    db.add(note)
    try:
        db.commit()
        db.refresh(note)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(503, "ثبت یادداشت انجام نشد.") from exc
    return {"id": note.id, "admin_id": note.admin_id, "content": note.content, "created_at": note.created_at}


def require_portal_same_origin(request: Request) -> None:
    origin = request.headers.get("origin")
    if not origin or origin == "null":
        raise HTTPException(403, "مبدأ درخواست معتبر نیست.")
    parsed = urlsplit(origin)
    if (
        parsed.scheme not in ("http", "https")
        or not parsed.netloc
        or parsed.path not in ("", "/")
        or parsed.query or parsed.fragment
        or parsed.username or parsed.password
    ):
        raise HTTPException(403, "مبدأ درخواست معتبر نیست.")
    configured = urlsplit(settings.public_site_origin.strip())
    if configured.scheme and configured.netloc:
        expected = configured.scheme.lower() + "://" + configured.netloc.lower()
    else:
        host = request.headers.get("x-forwarded-host") or request.headers.get("host", "")
        scheme = request.headers.get("x-forwarded-proto") or request.url.scheme
        expected = scheme.lower() + "://" + host.lower()
    received = parsed.scheme.lower() + "://" + parsed.netloc.lower()
    if received != expected:
        raise HTTPException(403, "درخواست باید از همان وب‌سایت ارسال شود.")


def _thread_for_student(db: Session, thread_id: int, student_id: int):
    thread = db.get(models.StudentMessageThread, thread_id)
    if thread is None or thread.student_auth_id != student_id:
        raise HTTPException(404, "گفت‌وگو پیدا نشد.")
    return thread


def _serialize_message(message: models.StudentMessage) -> dict:
    return {
        "id": message.id,
        "sender_type": message.sender_type,
        "sender_id": message.sender_id,
        "body": message.body,
        "created_at": message.created_at,
        "read_at": message.read_at,
    }


def _unread_count(db: Session, thread_id: int, recipient_type: str) -> int:
    return (
        db.query(models.StudentMessage)
        .filter(
            models.StudentMessage.thread_id == thread_id,
            models.StudentMessage.sender_type != recipient_type,
            models.StudentMessage.read_at.is_(None),
        )
        .count()
    )


@app.get("/student/messages/threads")
def student_message_threads(
    student: dict = Depends(require_student),
    db: Session = Depends(get_db),
):
    threads = (
        db.query(models.StudentMessageThread)
        .filter_by(student_auth_id=student["id"])
        .order_by(models.StudentMessageThread.last_message_at.desc(), models.StudentMessageThread.id.desc())
        .all()
    )
    return {
        "items": [
            {
                "id": thread.id,
                "channel": thread.channel,
                "advisor_assignment_id": thread.advisor_assignment_id,
                "subject": thread.subject,
                "status": thread.status,
                "last_message_at": thread.last_message_at,
                "unread_count": _unread_count(db, thread.id, "student"),
            }
            for thread in threads
        ],
        "total": len(threads),
    }


@app.post("/student/messages/threads", status_code=201)
def create_student_message_thread(
    payload: StudentMessageThreadCreate,
    request: Request,
    student: dict = Depends(require_student),
    db: Session = Depends(get_db),
):
    require_portal_same_origin(request)
    thread = (
        db.query(models.StudentMessageThread)
        .filter_by(student_auth_id=student["id"], channel="support")
        .first()
    )
    if thread is not None:
        if thread.status == "closed":
            thread.status = "open"
            thread.subject = payload.subject
            thread.updated_at = utcnow()
            db.commit()
            db.refresh(thread)
        return {
            "id": thread.id,
            "channel": thread.channel,
            "subject": thread.subject,
            "status": thread.status,
            "last_message_at": thread.last_message_at,
        }

    thread = models.StudentMessageThread(
        student_auth_id=student["id"],
        student_name=(student["first_name"] + " " + student["last_name"])[:180],
        channel="support",
        subject=payload.subject,
        status="open",
        last_message_at=utcnow(),
    )
    db.add(thread)
    try:
        db.commit()
        db.refresh(thread)
    except IntegrityError:
        db.rollback()
        thread = (
            db.query(models.StudentMessageThread)
            .filter_by(student_auth_id=student["id"], channel="support")
            .first()
        )
        if thread is None:
            raise HTTPException(503, "ساخت گفت‌وگو انجام نشد.")
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(503, "ساخت گفت‌وگو انجام نشد.") from exc
    return {
        "id": thread.id,
        "channel": thread.channel,
        "subject": thread.subject,
        "status": thread.status,
        "last_message_at": thread.last_message_at,
    }


@app.get("/student/messages/threads/{thread_id}/messages")
def student_thread_messages(
    thread_id: int,
    student: dict = Depends(require_student),
    db: Session = Depends(get_db),
):
    thread = _thread_for_student(db, thread_id, student["id"])
    messages = (
        db.query(models.StudentMessage)
        .filter_by(thread_id=thread.id)
        .order_by(models.StudentMessage.created_at.asc(), models.StudentMessage.id.asc())
        .limit(300)
        .all()
    )
    now = utcnow()
    for message in messages:
        if message.sender_type in {"admin", "mentor", "teacher"} and message.read_at is None:
            message.read_at = now
    db.commit()
    return {"items": [_serialize_message(message) for message in messages], "total": len(messages)}


@app.post("/student/messages/threads/{thread_id}/messages", status_code=201)
async def student_send_message(
    thread_id: int,
    payload: StudentMessageCreate,
    request: Request,
    student: dict = Depends(require_student),
    db: Session = Depends(get_db),
):
    require_portal_same_origin(request)
    thread = _thread_for_student(db, thread_id, student["id"])
    if thread.status != "open":
        raise HTTPException(409, "این گفت‌وگو بسته شده است.")
    message = models.StudentMessage(
        thread_id=thread.id,
        sender_type="student",
        sender_id=student["id"],
        body=payload.body,
    )
    thread.last_message_at = utcnow()
    thread.updated_at = utcnow()
    db.add(message)
    try:
        db.commit()
        db.refresh(message)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(503, "ارسال پیام انجام نشد.") from exc
    serialized = _serialize_message(message)
    await message_connections.broadcast(thread.id, {"type": "message", "message": serialized})
    return serialized


@app.get("/admin/messages/threads")
def admin_message_threads(
    status_filter: str | None = Query(default=None, alias="status", pattern="^(open|closed)$"),
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    query = db.query(models.StudentMessageThread)
    if status_filter:
        query = query.filter(models.StudentMessageThread.status == status_filter)
    threads = query.order_by(models.StudentMessageThread.last_message_at.desc()).limit(200).all()
    return {
        "items": [
            {
                "id": thread.id,
                "student_auth_id": thread.student_auth_id,
                "student_name": thread.student_name,
                "channel": thread.channel,
                "subject": thread.subject,
                "status": thread.status,
                "last_message_at": thread.last_message_at,
                "unread_count": _unread_count(db, thread.id, "admin"),
            }
            for thread in threads
        ],
        "total": len(threads),
    }


@app.get("/admin/messages/threads/{thread_id}/messages")
def admin_thread_messages(
    thread_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    thread = db.get(models.StudentMessageThread, thread_id)
    if thread is None:
        raise HTTPException(404, "گفت‌وگو پیدا نشد.")
    messages = (
        db.query(models.StudentMessage)
        .filter_by(thread_id=thread.id)
        .order_by(models.StudentMessage.created_at.asc(), models.StudentMessage.id.asc())
        .limit(300)
        .all()
    )
    now = utcnow()
    for message in messages:
        if message.sender_type in {"student", "mentor", "teacher"} and message.read_at is None:
            message.read_at = now
    db.commit()
    return {"items": [_serialize_message(message) for message in messages], "total": len(messages)}


@app.post("/admin/messages/threads/{thread_id}/messages", status_code=201)
async def admin_send_message(
    thread_id: int,
    payload: StudentMessageCreate,
    request: Request,
    admin: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    require_portal_same_origin(request)
    thread = db.get(models.StudentMessageThread, thread_id)
    if thread is None:
        raise HTTPException(404, "گفت‌وگو پیدا نشد.")
    if thread.status != "open":
        raise HTTPException(409, "این گفت‌وگو بسته شده است.")
    message = models.StudentMessage(
        thread_id=thread.id,
        sender_type="admin",
        sender_id=admin["id"],
        body=payload.body,
    )
    thread.last_message_at = utcnow()
    thread.updated_at = utcnow()
    db.add(message)
    _notify_student(db, thread.student_auth_id, "message", "پیام جدید از پشتیبانی چکاد",
                    "در گفت‌وگوی «" + thread.subject + "» پیام تازه‌ای دریافت کردی.",
                    "/dashboard/messages", f"thread:{thread.id}:message:{uuid4().hex}")
    try:
        db.commit()
        db.refresh(message)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(503, "ارسال پیام انجام نشد.") from exc
    serialized = _serialize_message(message)
    await message_connections.broadcast(thread.id, {"type": "message", "message": serialized})
    return serialized


@app.patch("/admin/messages/threads/{thread_id}")
def admin_update_thread_status(
    thread_id: int,
    request: Request,
    status_value: str = Query(pattern="^(open|closed)$"),
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    require_portal_same_origin(request)
    thread = db.get(models.StudentMessageThread, thread_id)
    if thread is None:
        raise HTTPException(404, "گفت‌وگو پیدا نشد.")
    thread.status = status_value
    thread.updated_at = utcnow()
    db.commit()
    return {"id": thread.id, "status": thread.status}


@app.get("/student/reports")
def student_study_reports(
    student: dict = Depends(require_student),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(models.StudentStudyReport)
        .filter_by(student_auth_id=student["id"])
        .order_by(models.StudentStudyReport.report_date.desc(), models.StudentStudyReport.id.desc())
        .limit(100)
        .all()
    )
    return {
        "items": [
            {
                "id": row.id,
                "report_date": row.report_date,
                "study_minutes": row.study_minutes,
                "topics": row.topics,
                "summary": row.summary,
                "blockers": row.blockers,
                "next_step": row.next_step,
                "created_at": row.created_at,
            }
            for row in rows
        ],
        "total": len(rows),
    }


@app.post("/student/reports", status_code=201)
def create_student_study_report(
    payload: StudentStudyReportCreate,
    request: Request,
    student: dict = Depends(require_student),
    db: Session = Depends(get_db),
):
    require_portal_same_origin(request)
    report = models.StudentStudyReport(
        student_auth_id=student["id"],
        report_date=payload.report_date,
        study_minutes=payload.study_minutes,
        topics=payload.topics,
        summary=payload.summary,
        blockers=payload.blockers,
        next_step=payload.next_step,
    )
    db.add(report)
    try:
        db.commit()
        db.refresh(report)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(503, "ثبت گزارش انجام نشد.") from exc
    return {"id": report.id, "created_at": report.created_at}


@app.get("/admin/student-reports")
def admin_student_reports(
    student_auth_id: int | None = Query(default=None, ge=1),
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    query = db.query(models.StudentStudyReport)
    if student_auth_id is not None:
        query = query.filter_by(student_auth_id=student_auth_id)
    rows = query.order_by(models.StudentStudyReport.report_date.desc()).limit(200).all()
    return {
        "items": [
            {
                "id": row.id,
                "student_auth_id": row.student_auth_id,
                "report_date": row.report_date,
                "study_minutes": row.study_minutes,
                "topics": row.topics,
                "summary": row.summary,
                "blockers": row.blockers,
                "next_step": row.next_step,
                "created_at": row.created_at,
            }
            for row in rows
        ],
        "total": len(rows),
    }


@app.get("/student/study-tasks")
def retired_student_study_tasks(
    student: dict = Depends(require_student),
):
    raise HTTPException(
        status_code=410,
        detail="برنامه هفتگی توسط مشاور یا مدرس تنظیم می‌شود؛ از مسیر /student/weekly-plan استفاده کنید.",
    )


@app.post("/student/study-tasks", status_code=403)
def deny_student_study_task_creation(
    student: dict = Depends(require_student),
):
    raise HTTPException(403, "دانش‌آموز اجازه افزودن فعالیت به برنامه هفتگی را ندارد.")


@app.patch("/student/study-tasks/{task_id}", status_code=403)
def deny_student_study_task_update(
    task_id: int,
    student: dict = Depends(require_student),
):
    raise HTTPException(403, "دانش‌آموز اجازه ویرایش برنامه هفتگی را ندارد.")


@app.delete("/student/study-tasks/{task_id}", status_code=403)
def deny_student_study_task_deletion(
    task_id: int,
    student: dict = Depends(require_student),
):
    raise HTTPException(403, "دانش‌آموز اجازه حذف فعالیت‌های برنامه هفتگی را ندارد.")


@app.get("/student/schedule")
def student_schedule(
    student: dict = Depends(require_student),
    db: Session = Depends(get_db),
):
    events = []
    profile = db.query(models.Student).filter_by(auth_student_id=student["id"]).first()
    if profile is not None:
        mentor_sessions = (
            db.query(models.MentorSession)
            .join(models.MentorAssignment, models.MentorSession.assignment_id == models.MentorAssignment.id)
            .join(models.MentorshipApplication, models.MentorAssignment.application_id == models.MentorshipApplication.id)
            .filter(
                models.MentorshipApplication.student_id == profile.id,
                models.MentorAssignment.status == "active",
                models.MentorSession.scheduled_at.is_not(None),
            )
            .all()
        )
        for session in mentor_sessions:
            events.append({
                "id": "mentor-" + str(session.id),
                "category": "mentorship",
                "title": "جلسه منتورینگ",
                "starts_at": session.scheduled_at,
                "duration_minutes": session.duration_minutes,
                "status": session.status,
            })

        tutor_sessions = (
            db.query(models.TutorSession)
            .join(models.TutorAssignment, models.TutorSession.assignment_id == models.TutorAssignment.id)
            .join(models.TutoringApplication, models.TutorAssignment.application_id == models.TutoringApplication.id)
            .filter(
                models.TutoringApplication.student_id == profile.id,
                models.TutorAssignment.status == "active",
                models.TutorSession.scheduled_at.is_not(None),
            )
            .all()
        )
        for session in tutor_sessions:
            events.append({
                "id": "tutor-" + str(session.id),
                "category": "tutoring",
                "title": "کلاس خصوصی",
                "starts_at": session.scheduled_at,
                "duration_minutes": session.duration_minutes,
                "status": session.status,
            })

    def _sort_time(event):
        value = event["starts_at"]
        return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value

    events.sort(key=_sort_time)
    return {"items": events, "total": len(events)}



@app.get("/student/classes")
def student_classes(
    student: dict = Depends(require_student),
    db: Session = Depends(get_db),
):
    profile = db.query(models.Student).filter_by(auth_student_id=student["id"]).first()
    if profile is None:
        return {"items": [], "total": 0}

    items = []
    mentor_rows = (
        db.query(models.MentorAssignment, models.MentorshipApplication)
        .join(models.MentorshipApplication, models.MentorAssignment.application_id == models.MentorshipApplication.id)
        .filter(
            models.MentorshipApplication.student_id == profile.id,
            models.MentorAssignment.status == "active",
        )
        .all()
    )
    for assignment, application in mentor_rows:
        sessions = (
            db.query(models.MentorSession)
            .filter_by(assignment_id=assignment.id)
            .order_by(models.MentorSession.scheduled_at.asc(), models.MentorSession.session_number.asc())
            .all()
        )
        items.append({
            "assignment_id": assignment.id,
            "kind": "mentorship",
            "title": "منتورینگ اختصاصی",
            "topic": "همراهی در مسیر " + ("المپیاد فیزیک" if application.field == "physics" else "المپیاد کامپیوتر"),
            "person_name": assignment.person_name,
            "field": application.field,
            "status": assignment.status,
            "start_date": assignment.start_date,
            "end_date": assignment.end_date,
            "sessions": [
                {
                    "id": session.id,
                    "session_number": session.session_number,
                    "scheduled_at": session.scheduled_at,
                    "duration_minutes": session.duration_minutes,
                    "status": session.status,
                }
                for session in sessions
            ],
        })

    tutor_rows = (
        db.query(models.TutorAssignment, models.TutoringApplication)
        .join(models.TutoringApplication, models.TutorAssignment.application_id == models.TutoringApplication.id)
        .filter(
            models.TutoringApplication.student_id == profile.id,
            models.TutorAssignment.status == "active",
        )
        .all()
    )
    for assignment, application in tutor_rows:
        sessions = (
            db.query(models.TutorSession)
            .filter_by(assignment_id=assignment.id)
            .order_by(models.TutorSession.scheduled_at.asc(), models.TutorSession.session_number.asc())
            .all()
        )
        items.append({
            "assignment_id": assignment.id,
            "kind": "tutoring",
            "title": "کلاس خصوصی",
            "topic": application.topic,
            "person_name": assignment.person_name,
            "field": application.field,
            "status": assignment.status,
            "start_date": assignment.start_date,
            "end_date": assignment.end_date,
            "sessions": [
                {
                    "id": session.id,
                    "session_number": session.session_number,
                    "scheduled_at": session.scheduled_at,
                    "duration_minutes": session.duration_minutes,
                    "status": session.status,
                }
                for session in sessions
            ],
        })
    items.sort(key=lambda item: (item["start_date"], item["assignment_id"]), reverse=True)
    return {"items": items, "total": len(items)}


@app.get("/student/messages/advisor")
def student_advisor_availability(
    student: dict = Depends(require_student),
    db: Session = Depends(get_db),
):
    profile = db.query(models.Student).filter_by(auth_student_id=student["id"]).first()
    if profile is None:
        return {"available": False, "assignment": None}
    row = (
        db.query(models.MentorAssignment, models.MentorshipApplication)
        .join(models.MentorshipApplication, models.MentorAssignment.application_id == models.MentorshipApplication.id)
        .filter(
            models.MentorshipApplication.student_id == profile.id,
            models.MentorAssignment.status == "active",
        )
        .order_by(models.MentorAssignment.created_at.desc(), models.MentorAssignment.id.desc())
        .first()
    )
    if row is None:
        return {"available": False, "assignment": None}
    assignment, application = row
    return {
        "available": True,
        "assignment": {
            "id": assignment.id,
            "mentor_name": assignment.person_name,
            "field": application.field,
        },
    }


@app.post("/student/messages/advisor", status_code=201)
def create_student_advisor_thread(
    request: Request,
    student: dict = Depends(require_student),
    db: Session = Depends(get_db),
):
    require_portal_same_origin(request)
    profile = db.query(models.Student).filter_by(auth_student_id=student["id"]).first()
    if profile is None:
        raise HTTPException(409, "برای آغاز گفت‌وگو ابتدا یک درخواست منتورینگ ثبت کن.")
    row = (
        db.query(models.MentorAssignment, models.MentorshipApplication)
        .join(models.MentorshipApplication, models.MentorAssignment.application_id == models.MentorshipApplication.id)
        .filter(
            models.MentorshipApplication.student_id == profile.id,
            models.MentorAssignment.status == "active",
        )
        .order_by(models.MentorAssignment.created_at.desc(), models.MentorAssignment.id.desc())
        .first()
    )
    if row is None:
        raise HTTPException(409, "هنوز منتور فعالی به حساب تو اختصاص داده نشده است.")
    assignment, _application = row
    subject = ("گفت‌وگو با " + (assignment.person_name or "منتور اختصاصی"))[:140]
    thread = (
        db.query(models.StudentMessageThread)
        .filter_by(
            student_auth_id=student["id"],
            channel="advisor",
            advisor_assignment_id=assignment.id,
        )
        .first()
    )
    if thread is not None:
        if thread.status == "closed":
            thread.status = "open"
            thread.updated_at = utcnow()
            db.commit()
            db.refresh(thread)
        return {
            "id": thread.id,
            "channel": thread.channel,
            "advisor_assignment_id": thread.advisor_assignment_id,
            "tutor_assignment_id": thread.tutor_assignment_id,
            "subject": thread.subject,
            "status": thread.status,
            "last_message_at": thread.last_message_at,
        }
    thread = models.StudentMessageThread(
        student_auth_id=student["id"],
        student_name=(student["first_name"] + " " + student["last_name"])[:180],
        channel="advisor",
        advisor_assignment_id=assignment.id,
        subject=subject,
        status="open",
        last_message_at=utcnow(),
    )
    db.add(thread)
    try:
        db.commit()
        db.refresh(thread)
    except IntegrityError:
        db.rollback()
        thread = (
            db.query(models.StudentMessageThread)
            .filter_by(
                student_auth_id=student["id"],
                channel="advisor",
                advisor_assignment_id=assignment.id,
            )
            .first()
        )
        if thread is None:
            raise HTTPException(503, "ساخت گفت‌وگو با مشاور انجام نشد.")
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(503, "ساخت گفت‌وگو با مشاور انجام نشد.") from exc
    return {
        "id": thread.id,
        "channel": thread.channel,
        "advisor_assignment_id": thread.advisor_assignment_id,
        "subject": thread.subject,
        "status": thread.status,
        "last_message_at": thread.last_message_at,
    }


def _mentor_thread_for_user(db: Session, thread_id: int, mentor_profile_id: int):
    thread = (
        db.query(models.StudentMessageThread)
        .join(models.MentorAssignment, models.StudentMessageThread.advisor_assignment_id == models.MentorAssignment.id)
        .filter(
            models.StudentMessageThread.id == thread_id,
            models.StudentMessageThread.channel == "advisor",
            models.MentorAssignment.mentor_id == mentor_profile_id,
            models.MentorAssignment.status.in_(("active", "completed")),
        )
        .first()
    )
    if thread is None:
        raise HTTPException(404, "گفت‌وگو پیدا نشد.")
    return thread


@app.get("/mentor/messages/threads")
def mentor_message_threads(
    mentor: dict = Depends(require_mentor),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(models.StudentMessageThread, models.MentorshipApplication)
        .join(models.MentorAssignment, models.StudentMessageThread.advisor_assignment_id == models.MentorAssignment.id)
        .join(models.MentorshipApplication, models.MentorAssignment.application_id == models.MentorshipApplication.id)
        .filter(
            models.MentorAssignment.mentor_id == mentor["mentor_profile_id"],
            models.MentorAssignment.status.in_(("active", "completed")),
            models.StudentMessageThread.channel == "advisor",
        )
        .order_by(models.StudentMessageThread.last_message_at.desc())
        .limit(200)
        .all()
    )
    return {
        "items": [
            {
                "id": thread.id,
                "channel": thread.channel,
                "subject": thread.subject,
                "student_name": thread.student_name,
                "status": thread.status,
                "last_message_at": thread.last_message_at,
                "unread_count": _unread_count(db, thread.id, "mentor"),
                "field": application.field,
            }
            for thread, application in rows
        ],
        "total": len(rows),
    }


@app.get("/mentor/messages/threads/{thread_id}/messages")
def mentor_thread_messages(
    thread_id: int,
    mentor: dict = Depends(require_mentor),
    db: Session = Depends(get_db),
):
    thread = _mentor_thread_for_user(db, thread_id, mentor["mentor_profile_id"])
    messages = (
        db.query(models.StudentMessage)
        .filter_by(thread_id=thread.id)
        .order_by(models.StudentMessage.created_at.asc(), models.StudentMessage.id.asc())
        .limit(300)
        .all()
    )
    now = utcnow()
    for message in messages:
        if message.sender_type == "student" and message.read_at is None:
            message.read_at = now
    db.commit()
    return {"items": [_serialize_message(message) for message in messages], "total": len(messages)}


@app.post("/mentor/messages/threads/{thread_id}/messages", status_code=201)
async def mentor_send_message(
    thread_id: int,
    payload: StudentMessageCreate,
    request: Request,
    mentor: dict = Depends(require_mentor),
    db: Session = Depends(get_db),
):
    require_portal_same_origin(request)
    thread = _mentor_thread_for_user(db, thread_id, mentor["mentor_profile_id"])
    assignment = db.get(models.MentorAssignment, thread.advisor_assignment_id)
    if thread.status != "open" or assignment is None or assignment.status != "active":
        raise HTTPException(409, "این گفت‌وگو در حال حاضر برای ارسال پیام فعال نیست.")
    message = models.StudentMessage(
        thread_id=thread.id,
        sender_type="mentor",
        sender_id=mentor["id"],
        body=payload.body,
    )
    thread.last_message_at = utcnow()
    thread.updated_at = utcnow()
    db.add(message)
    _notify_student(db, thread.student_auth_id, "message", "پیام جدید از منتور",
                    "در گفت‌وگوی «" + thread.subject + "» پیام تازه‌ای دریافت کردی.",
                    "/dashboard/messages", f"thread:{thread.id}:message:{uuid4().hex}")
    try:
        db.commit()
        db.refresh(message)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(503, "ارسال پیام انجام نشد.") from exc
    serialized = _serialize_message(message)
    await message_connections.broadcast(thread.id, {"type": "message", "message": serialized})
    return serialized


@app.post("/admin/assignments", status_code=201)
async def create_assignment(
    payload: AdminAssignmentCreate,
    request: Request,
    admin: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    require_same_origin(request)
    if payload.end_date is not None and payload.end_date < payload.start_date:
        raise HTTPException(422, "تاریخ پایان نمی‌تواند قبل از شروع باشد.")
    person = await fetch_public_person(payload.kind, payload.person_id)
    application_model = (
        models.MentorshipApplication if payload.kind == "mentorship"
        else models.TutoringApplication
    )
    # Serialize decisions for one application and one provider. PostgreSQL
    # advisory locks prevent concurrent assignments from oversubscribing capacity.
    if db.bind is not None and db.bind.dialect.name == "postgresql":
        lock_material = f"{payload.kind}:{payload.person_id}".encode("utf-8")
        lock_key = int.from_bytes(hashlib.sha256(lock_material).digest()[:8], "big", signed=True)
        db.execute(text("SELECT pg_advisory_xact_lock(:lock_key)"), {"lock_key": lock_key})

    application = (
        db.query(application_model)
        .filter_by(id=payload.application_id)
        .with_for_update()
        .first()
    )
    if application is None:
        raise HTTPException(404, "درخواست پیدا نشد.")
    if application.status in {"rejected", "cancelled", "completed"}:
        raise HTTPException(409, "برای درخواست بسته‌شده نمی‌توان تخصیص فعال ایجاد کرد.")
    if application.field != person["field"]:
        raise HTTPException(422, "رشته منتور یا مدرس با رشته درخواست مطابقت ندارد.")

    assignment_model = (
        models.MentorAssignment if payload.kind == "mentorship"
        else models.TutorAssignment
    )
    session_model = models.MentorSession if payload.kind == "mentorship" else models.TutorSession
    if payload.kind == "mentorship":
        active_person_assignments = db.query(models.MentorAssignment).filter_by(
            mentor_id=payload.person_id,
            status="active",
        ).count()
    else:
        active_person_assignments = db.query(models.TutorAssignment).filter_by(
            tutor_id=payload.person_id,
            status="active",
        ).count()
    if active_person_assignments >= person.get("capacity", 0):
        raise HTTPException(409, "ظرفیت فعال این منتور یا مدرس تکمیل شده است.")
    existing = db.query(assignment_model).filter_by(
        application_id=payload.application_id,
        status="active",
    ).first()
    if existing is not None:
        raise HTTPException(409, "برای این درخواست از قبل تخصیص فعالی وجود دارد.")

    assignment_values = {
        "application_id": payload.application_id,
        "person_name": (person.get("first_name", "") + " " + person.get("last_name", "")).strip()[:180],
        "start_date": payload.start_date,
        "end_date": payload.end_date,
        "status": "active",
    }
    if payload.kind == "mentorship":
        assignment_values["mentor_id"] = payload.person_id
    else:
        assignment_values["tutor_id"] = payload.person_id
    assignment = assignment_model(**assignment_values)
    db.add(assignment)
    try:
        db.flush()
        for index, session in enumerate(payload.sessions, start=1):
            scheduled = session.scheduled_at
            if scheduled.date() < payload.start_date:
                raise HTTPException(422, "زمان جلسه نمی‌تواند قبل از شروع تخصیص باشد.")
            if payload.end_date is not None and scheduled.date() > payload.end_date:
                raise HTTPException(422, "زمان جلسه خارج از بازه تخصیص است.")
            session_row = session_model(
                assignment_id=assignment.id,
                session_number=index,
                scheduled_at=scheduled,
                duration_minutes=session.duration_minutes,
                status="scheduled",
            )
            db.add(session_row)
        application.status = "active"
        _notify_student(db, application.student.auth_student_id if application.student else None, "assignment",
                        "همراه آموزشی به تو اختصاص داده شد",
                        ("منتور اختصاصی «" if payload.kind == "mentorship" else "مدرس کلاس خصوصی «")
                        + (assignment.person_name or "همراه آموزشی") + "» برای شروع همکاری ثبت شد. زمان جلسات را از پنل ببین.",
                        "/dashboard/classes", f"assignment:{payload.kind}:{assignment.id}:created")
        db.commit()
        db.refresh(assignment)
    except HTTPException:
        db.rollback()
        raise
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, "این درخواست هم‌زمان تخصیص فعال دیگری دریافت کرده است.") from exc
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(503, "ثبت تخصیص و جلسات انجام نشد.") from exc

    return {
        "id": assignment.id,
        "kind": payload.kind,
        "application_id": assignment.application_id,
        "person_id": payload.person_id,
        "person_name": assignment.person_name,
        "start_date": assignment.start_date,
        "end_date": assignment.end_date,
        "status": assignment.status,
        "sessions_count": len(payload.sessions),
        "created_by": admin["id"],
    }


@app.get("/admin/assignments")
def admin_assignments(
    status_filter: str | None = Query(default=None, alias="status", pattern="^(active|completed|cancelled)$"),
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    items = []
    for assignment, application in (
        db.query(models.MentorAssignment, models.MentorshipApplication)
        .join(models.MentorshipApplication, models.MentorAssignment.application_id == models.MentorshipApplication.id)
        .all()
    ):
        if status_filter and assignment.status != status_filter:
            continue
        items.append({
            "id": assignment.id,
            "kind": "mentorship",
            "application_id": application.id,
            "student_name": application.student.first_name + " " + application.student.last_name,
            "student_auth_id": application.student.auth_student_id,
            "field": application.field,
            "person_id": assignment.mentor_id,
            "person_name": assignment.person_name,
            "start_date": assignment.start_date,
            "end_date": assignment.end_date,
            "status": assignment.status,
        })
    for assignment, application in (
        db.query(models.TutorAssignment, models.TutoringApplication)
        .join(models.TutoringApplication, models.TutorAssignment.application_id == models.TutoringApplication.id)
        .all()
    ):
        if status_filter and assignment.status != status_filter:
            continue
        items.append({
            "id": assignment.id,
            "kind": "tutoring",
            "application_id": application.id,
            "student_name": application.student.first_name + " " + application.student.last_name,
            "student_auth_id": application.student.auth_student_id,
            "field": application.field,
            "person_id": assignment.tutor_id,
            "person_name": assignment.person_name,
            "start_date": assignment.start_date,
            "end_date": assignment.end_date,
            "status": assignment.status,
        })
    items.sort(key=lambda item: (item["start_date"], item["id"]), reverse=True)
    return {"items": items, "total": len(items)}


@app.patch("/admin/assignments/{kind}/{assignment_id}")
def update_assignment_status(
    kind: str,
    assignment_id: int,
    payload: AdminAssignmentStatusUpdate,
    request: Request,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    require_same_origin(request)
    if kind == "mentorship":
        assignment = db.get(models.MentorAssignment, assignment_id)
        application_model = models.MentorshipApplication
    elif kind == "tutoring":
        assignment = db.get(models.TutorAssignment, assignment_id)
        application_model = models.TutoringApplication
    else:
        raise HTTPException(404, "تخصیص پیدا نشد.")
    if assignment is None:
        raise HTTPException(404, "تخصیص پیدا نشد.")
    application = db.get(application_model, assignment.application_id)
    previous_status = assignment.status
    assignment.status = payload.status
    if application is not None and payload.status == "completed":
        application.status = "completed"
    elif application is not None and payload.status == "cancelled":
        application.status = "cancelled"
    elif application is not None and payload.status == "active":
        application.status = "active"
    assignment.updated_at = utcnow()
    if kind == "mentorship":
        advisor_thread = db.query(models.StudentMessageThread).filter_by(
            advisor_assignment_id=assignment.id
        ).first()
        if advisor_thread is not None:
            advisor_thread.status = "open" if payload.status == "active" else "closed"
            advisor_thread.updated_at = utcnow()
    if application is not None and previous_status != assignment.status:
        student_id = application.student.auth_student_id if application.student else None
        labels = {"active": "فعال", "completed": "تکمیل‌شده", "cancelled": "لغوشده"}
        _notify_student(db, student_id, "assignment", "وضعیت همکاری آموزشی تغییر کرد",
                        "وضعیت همکاری " + ("منتورینگ" if kind == "mentorship" else "کلاس خصوصی")
                        + " با «" + (assignment.person_name or "همراه آموزشی") + "» به «" + labels.get(assignment.status, assignment.status) + "» تغییر کرد.",
                        "/dashboard/classes", f"assignment:{kind}:{assignment.id}:{assignment.status}:{uuid4().hex}")
    db.commit()
    return {"id": assignment.id, "kind": kind, "status": assignment.status}




def _mentor_assignment_for_user(db: Session, assignment_id: int, mentor_profile_id: int):
    assignment = (
        db.query(models.MentorAssignment)
        .filter_by(id=assignment_id, mentor_id=mentor_profile_id)
        .first()
    )
    if assignment is None:
        raise HTTPException(404, "تخصیص منتورینگ پیدا نشد.")
    return assignment


@app.get("/mentor/assignments")
def mentor_assignments(
    mentor: dict = Depends(require_mentor),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(models.MentorAssignment, models.MentorshipApplication)
        .join(models.MentorshipApplication, models.MentorAssignment.application_id == models.MentorshipApplication.id)
        .join(models.Student, models.MentorshipApplication.student_id == models.Student.id)
        .filter(
            models.MentorAssignment.mentor_id == mentor["mentor_profile_id"],
            models.MentorAssignment.status.in_(("active", "completed")),
        )
        .order_by(models.MentorAssignment.created_at.desc(), models.MentorAssignment.id.desc())
        .all()
    )
    return {
        "items": [
            {
                "id": assignment.id,
                "application_id": application.id,
                "student_name": application.student.first_name + " " + application.student.last_name,
                "student_auth_id": application.student.auth_student_id,
                "grade": application.student.grade,
                "field": application.field,
                "status": assignment.status,
                "start_date": assignment.start_date,
                "end_date": assignment.end_date,
                "person_name": assignment.person_name,
            }
            for assignment, application in rows
        ],
        "total": len(rows),
    }


@app.get("/mentor/assignments/{assignment_id}/study-reports")
def mentor_assignment_study_reports(
    assignment_id: int,
    mentor: dict = Depends(require_mentor),
    db: Session = Depends(get_db),
):
    assignment = _mentor_assignment_for_user(db, assignment_id, mentor["mentor_profile_id"])
    if assignment.status not in {"active", "completed"}:
        raise HTTPException(409, "گزارش این تخصیص در دسترس نیست.")
    application = db.get(models.MentorshipApplication, assignment.application_id)
    if application is None:
        raise HTTPException(404, "درخواست منتورینگ پیدا نشد.")
    student = db.get(models.Student, application.student_id)
    if student is None or student.auth_student_id is None:
        return {"items": [], "total": 0}
    rows = (
        db.query(models.StudentStudyReport)
        .filter_by(student_auth_id=student.auth_student_id)
        .order_by(models.StudentStudyReport.report_date.desc(), models.StudentStudyReport.id.desc())
        .limit(200)
        .all()
    )
    return {
        "items": [
            {
                "id": row.id,
                "report_date": row.report_date,
                "study_minutes": row.study_minutes,
                "topics": row.topics,
                "summary": row.summary,
                "blockers": row.blockers,
                "next_step": row.next_step,
                "created_at": row.created_at,
            }
            for row in rows
        ],
        "total": len(rows),
    }


@app.get("/mentor/assignments/{assignment_id}/weekly-reports")
def mentor_assignment_weekly_reports(
    assignment_id: int,
    mentor: dict = Depends(require_mentor),
    db: Session = Depends(get_db),
):
    assignment = _mentor_assignment_for_user(db, assignment_id, mentor["mentor_profile_id"])
    rows = (
        db.query(models.MentorWeeklyReport)
        .filter_by(assignment_id=assignment.id)
        .order_by(models.MentorWeeklyReport.week_number.desc(), models.MentorWeeklyReport.id.desc())
        .all()
    )
    return {
        "items": [
            {
                "id": row.id,
                "week_number": row.week_number,
                "content": row.content,
                "created_at": row.created_at,
            }
            for row in rows
        ],
        "total": len(rows),
    }


@app.post("/mentor/assignments/{assignment_id}/weekly-reports", status_code=201)
def create_mentor_weekly_report(
    assignment_id: int,
    payload: MentorWeeklyReportCreate,
    request: Request,
    mentor: dict = Depends(require_mentor),
    db: Session = Depends(get_db),
):
    require_portal_same_origin(request)
    assignment = _mentor_assignment_for_user(db, assignment_id, mentor["mentor_profile_id"])
    if assignment.status != "active":
        raise HTTPException(409, "برای تخصیص غیرفعال نمی‌توان گزارش جدید ثبت کرد.")
    existing = (
        db.query(models.MentorWeeklyReport)
        .filter_by(assignment_id=assignment.id, week_number=payload.week_number)
        .first()
    )
    if existing is not None:
        raise HTTPException(409, "برای این هفته قبلاً گزارش ثبت شده است.")
    report = models.MentorWeeklyReport(
        assignment_id=assignment.id,
        week_number=payload.week_number,
        content=payload.content,
    )
    db.add(report)
    application = db.get(models.MentorshipApplication, assignment.application_id)
    _notify_student(db, application.student.auth_student_id if application is not None and application.student else None,
                    "mentor_report", "بازخورد هفتگی منتورت آماده است",
                    "گزارش هفته " + str(payload.week_number) + " در بخش گزارش‌ها ثبت شد.",
                    "/dashboard/reports", f"mentor-report:{assignment.id}:{payload.week_number}")
    try:
        db.commit()
        db.refresh(report)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, "برای این هفته قبلاً گزارش ثبت شده است.") from exc
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(503, "ثبت گزارش هفتگی انجام نشد.") from exc
    return {
        "id": report.id,
        "week_number": report.week_number,
        "content": report.content,
        "created_at": report.created_at,
    }


@app.get("/student/mentor-reports")
def student_mentor_reports(
    student: dict = Depends(require_student),
    db: Session = Depends(get_db),
):
    profile = db.query(models.Student).filter_by(auth_student_id=student["id"]).first()
    if profile is None:
        return {"items": [], "total": 0}
    rows = (
        db.query(models.MentorWeeklyReport, models.MentorAssignment)
        .join(models.MentorAssignment, models.MentorWeeklyReport.assignment_id == models.MentorAssignment.id)
        .join(models.MentorshipApplication, models.MentorAssignment.application_id == models.MentorshipApplication.id)
        .filter(
            models.MentorshipApplication.student_id == profile.id,
            models.MentorAssignment.status.in_(("active", "completed")),
        )
        .order_by(models.MentorWeeklyReport.created_at.desc(), models.MentorWeeklyReport.id.desc())
        .limit(100)
        .all()
    )
    return {
        "items": [
            {
                "id": report.id,
                "week_number": report.week_number,
                "content": report.content,
                "created_at": report.created_at,
                "mentor_name": assignment.person_name,
            }
            for report, assignment in rows
        ],
        "total": len(rows),
    }


def _serialize_invoice(invoice: models.StudentInvoice, include_private: bool = False) -> dict:
    status_value = invoice.status
    if (
        status_value == "issued"
        and invoice.due_date is not None
        and invoice.due_date < utcnow().date()
    ):
        status_value = "overdue"
    result = {
        "id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "service_type": invoice.service_type,
        "application_id": invoice.application_id,
        "title": invoice.title,
        "description": invoice.description,
        "amount_toman": invoice.amount_toman,
        "due_date": invoice.due_date,
        "status": status_value,
        "payment_instructions": invoice.payment_instructions,
        "paid_at": invoice.paid_at,
        "created_at": invoice.created_at,
    }
    if include_private:
        result["student_auth_id"] = invoice.student_auth_id
        result["payment_reference"] = invoice.payment_reference
        result["created_by_admin_id"] = invoice.created_by_admin_id
    return result


@app.get("/student/invoices")
def student_invoices(
    student: dict = Depends(require_student),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(models.StudentInvoice)
        .filter_by(student_auth_id=student["id"])
        .order_by(models.StudentInvoice.created_at.desc(), models.StudentInvoice.id.desc())
        .all()
    )
    return {"items": [_serialize_invoice(row) for row in rows], "total": len(rows)}


@app.get("/admin/students")
def admin_student_directory(
    search: str | None = Query(default=None, max_length=100),
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    """Return a minimal, searchable list for admin-side invoice assignment."""
    query = db.query(models.Student).filter(models.Student.auth_student_id.is_not(None))
    term = (search or "").strip()
    if term:
        pattern = "%" + term.replace("%", "\\%").replace("_", "\\_") + "%"
        filters = [
            models.Student.first_name.ilike(pattern),
            models.Student.last_name.ilike(pattern),
        ]
        if term.isdecimal():
            filters.append(models.Student.auth_student_id == int(term))
        query = query.filter(or_(*filters))
    rows = (
        query.order_by(models.Student.last_name.asc(), models.Student.first_name.asc())
        .limit(500)
        .all()
    )
    return {
        "items": [
            {
                "student_auth_id": row.auth_student_id,
                "display_name": (row.first_name + " " + row.last_name).strip(),
                "grade": row.grade,
                "field": row.field,
            }
            for row in rows
        ],
        "total": len(rows),
    }


@app.get("/admin/invoices")
def admin_invoices(
    student_auth_id: int | None = Query(default=None, ge=1),
    invoice_status: str | None = Query(default=None, alias="status", pattern="^(issued|paid|void)$"),
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    query = db.query(models.StudentInvoice)
    if student_auth_id is not None:
        query = query.filter_by(student_auth_id=student_auth_id)
    if invoice_status:
        query = query.filter_by(status=invoice_status)
    rows = query.order_by(models.StudentInvoice.created_at.desc(), models.StudentInvoice.id.desc()).limit(300).all()
    return {"items": [_serialize_invoice(row, include_private=True) for row in rows], "total": len(rows)}


@app.post("/admin/invoices", status_code=201)
def create_invoice(
    payload: StudentInvoiceCreate,
    request: Request,
    admin: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    require_same_origin(request)
    student = db.query(models.Student).filter_by(auth_student_id=payload.student_auth_id).first()
    if student is None:
        raise HTTPException(404, "پروفایل دانش‌آموز در سامانه درخواست‌ها پیدا نشد.")
    if payload.application_id is not None:
        if payload.service_type == "mentorship":
            linked = db.query(models.MentorshipApplication).filter_by(
                id=payload.application_id, student_id=student.id
            ).first()
        elif payload.service_type == "tutoring":
            linked = db.query(models.TutoringApplication).filter_by(
                id=payload.application_id, student_id=student.id
            ).first()
        else:
            linked = None
        if linked is None:
            raise HTTPException(422, "درخواست انتخاب‌شده به این دانش‌آموز تعلق ندارد.")
    elif payload.service_type != "other":
        raise HTTPException(422, "برای فاکتور منتورینگ یا کلاس، شناسه درخواست لازم است.")

    invoice = models.StudentInvoice(
        invoice_number="TMP-" + uuid4().hex[:16],
        student_id=student.id,
        student_auth_id=payload.student_auth_id,
        service_type=payload.service_type,
        application_id=payload.application_id,
        title=payload.title,
        description=payload.description,
        amount_toman=payload.amount_toman,
        due_date=payload.due_date,
        payment_instructions=payload.payment_instructions,
        status="issued",
        created_by_admin_id=admin["id"],
    )
    db.add(invoice)
    try:
        db.flush()
        invoice.invoice_number = f"CH-INV-{invoice.id:06d}"
        _notify_student(db, invoice.student_auth_id, "invoice", "فاکتور جدید در حساب تو ثبت شد",
                        "فاکتور «" + invoice.title + "» در بخش فاکتورها قابل مشاهده است.",
                        "/dashboard/invoices", f"invoice:{invoice.id}:issued")
        db.commit()
        db.refresh(invoice)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(503, "صدور فاکتور انجام نشد.") from exc
    return _serialize_invoice(invoice, include_private=True)


@app.patch("/admin/invoices/{invoice_id}")
def update_invoice_status(
    invoice_id: int,
    payload: AdminInvoiceStatusUpdate,
    request: Request,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    require_same_origin(request)
    invoice = db.get(models.StudentInvoice, invoice_id)
    if invoice is None:
        raise HTTPException(404, "فاکتور پیدا نشد.")
    previous_status = invoice.status
    if payload.status == "paid":
        invoice.paid_at = utcnow()
        invoice.payment_reference = payload.payment_reference
    else:
        if payload.payment_reference is not None:
            raise HTTPException(422, "شناسه پرداخت فقط برای فاکتور پرداخت‌شده قابل ثبت است.")
        invoice.paid_at = None
        invoice.payment_reference = None
    invoice.status = payload.status
    invoice.updated_at = utcnow()
    if previous_status != invoice.status:
        labels = {"issued": "صادرشده", "paid": "پرداخت‌شده", "void": "باطل‌شده"}
        _notify_student(db, invoice.student_auth_id, "invoice", "وضعیت فاکتور تغییر کرد",
                        "وضعیت فاکتور «" + invoice.title + "» به «" + labels.get(invoice.status, invoice.status) + "» تغییر کرد.",
                        "/dashboard/invoices", f"invoice:{invoice.id}:{invoice.status}:{uuid4().hex}")
    db.commit()
    db.refresh(invoice)
    return _serialize_invoice(invoice, include_private=True)


async def require_teacher(request: Request) -> dict:
    headers = {}
    if request.headers.get("cookie"):
        headers["Cookie"] = request.headers["cookie"]
    if request.headers.get("authorization"):
        headers["Authorization"] = request.headers["authorization"]
    if not headers:
        raise HTTPException(401, "برای ادامه وارد حساب مدرس شوید.")
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            response = await client.get(
                settings.auth_internal_url.rstrip("/") + "/teacher/me",
                headers=headers,
            )
    except httpx.RequestError as exc:
        raise HTTPException(503, "سرویس احراز هویت مدرس در دسترس نیست.") from exc
    if response.status_code == 401:
        raise HTTPException(401, "نشست مدرس معتبر نیست؛ دوباره وارد شوید.")
    if response.status_code != 200:
        raise HTTPException(503, "اعتبارسنجی حساب مدرس انجام نشد.")
    try:
        teacher = response.json()
    except ValueError as exc:
        raise HTTPException(503, "پاسخ سرویس احراز هویت معتبر نیست.") from exc
    if (
        not isinstance(teacher, dict)
        or not isinstance(teacher.get("id"), int)
        or not isinstance(teacher.get("tutor_profile_id"), int)
        or not isinstance(teacher.get("display_name"), str)
    ):
        raise HTTPException(503, "اطلاعات حساب مدرس کامل نیست.")
    return teacher


class MessageConnectionManager:
    """In-process WebSocket fan-out for the single application-service instance."""

    def __init__(self):
        self._connections: dict[int, set[WebSocket]] = {}

    async def connect(self, thread_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections.setdefault(thread_id, set()).add(websocket)

    def disconnect(self, thread_id: int, websocket: WebSocket) -> None:
        group = self._connections.get(thread_id)
        if group is None:
            return
        group.discard(websocket)
        if not group:
            self._connections.pop(thread_id, None)

    async def broadcast(self, thread_id: int, event: dict) -> None:
        group = list(self._connections.get(thread_id, set()))
        if not group:
            return
        results = await asyncio.gather(
            *(socket.send_json(event) for socket in group),
            return_exceptions=True,
        )
        for socket, result in zip(group, results):
            if isinstance(result, Exception):
                self.disconnect(thread_id, socket)


message_connections = MessageConnectionManager()


async def _authenticate_websocket(websocket: WebSocket, endpoint: str) -> dict | None:
    headers = {}
    cookie = websocket.headers.get("cookie")
    authorization = websocket.headers.get("authorization")
    if cookie:
        headers["Cookie"] = cookie
    if authorization:
        headers["Authorization"] = authorization
    if not headers:
        return None
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            response = await client.get(settings.auth_internal_url.rstrip("/") + endpoint, headers=headers)
    except httpx.RequestError:
        return None
    if response.status_code != 200:
        return None
    try:
        identity = response.json()
    except ValueError:
        return None
    return identity if isinstance(identity, dict) else None


async def _serve_message_websocket(websocket: WebSocket, thread_id: int, role: str) -> None:
    endpoints = {
        "student": "/student/me",
        "mentor": "/mentor/me",
        "teacher": "/teacher/me",
        "admin": "/me",
    }
    identity = await _authenticate_websocket(websocket, endpoints[role])
    if identity is None:
        await websocket.close(code=1008, reason="Authentication required")
        return

    db_provider = app.dependency_overrides.get(get_db, get_db)
    db_scope = db_provider()
    db = next(db_scope)
    try:
        thread = db.get(models.StudentMessageThread, thread_id)
        allowed = False
        if thread is not None:
            if role == "student":
                allowed = thread.student_auth_id == identity.get("id")
            elif role == "admin":
                allowed = True
            elif role == "mentor" and thread.advisor_assignment_id is not None:
                assignment = db.get(models.MentorAssignment, thread.advisor_assignment_id)
                allowed = assignment is not None and assignment.mentor_id == identity.get("mentor_profile_id")
            elif role == "teacher" and thread.tutor_assignment_id is not None:
                assignment = db.get(models.TutorAssignment, thread.tutor_assignment_id)
                allowed = assignment is not None and assignment.tutor_id == identity.get("tutor_profile_id")
        if not allowed:
            await websocket.close(code=1008, reason="Conversation access denied")
            return

        await message_connections.connect(thread_id, websocket)
        try:
            while True:
                incoming = await websocket.receive_text()
                if incoming == "ping":
                    await websocket.send_json({"type": "pong"})
        except WebSocketDisconnect:
            pass
        finally:
            message_connections.disconnect(thread_id, websocket)
    finally:
        db_scope.close()


@app.websocket("/student/messages/threads/{thread_id}/ws")
async def student_message_websocket(websocket: WebSocket, thread_id: int):
    await _serve_message_websocket(websocket, thread_id, "student")


@app.websocket("/mentor/messages/threads/{thread_id}/ws")
async def mentor_message_websocket(websocket: WebSocket, thread_id: int):
    await _serve_message_websocket(websocket, thread_id, "mentor")


@app.websocket("/teacher/messages/threads/{thread_id}/ws")
async def teacher_message_websocket(websocket: WebSocket, thread_id: int):
    await _serve_message_websocket(websocket, thread_id, "teacher")


@app.websocket("/admin/messages/threads/{thread_id}/ws")
async def admin_message_websocket(websocket: WebSocket, thread_id: int):
    await _serve_message_websocket(websocket, thread_id, "admin")


def _serialize_managed_task(task: models.AssignedStudyTask) -> dict:
    return {
        "id": task.id,
        "student_auth_id": task.student_auth_id,
        "mentor_assignment_id": task.mentor_assignment_id,
        "tutor_assignment_id": task.tutor_assignment_id,
        "assignment_kind": "mentorship" if task.mentor_assignment_id is not None else "tutoring",
        "title": task.title,
        "description": task.description,
        "planned_at": task.planned_at,
        "duration_minutes": task.duration_minutes,
        "status": task.status,
        "created_at": task.created_at,
        "updated_at": task.updated_at,
    }


def _task_range(query, start: datetime | None, end: datetime | None):
    if start is not None:
        if start.tzinfo is None or start.utcoffset() is None:
            raise HTTPException(422, "زمان شروع بازه باید منطقه زمانی داشته باشد.")
        query = query.filter(models.AssignedStudyTask.planned_at >= start)
    if end is not None:
        if end.tzinfo is None or end.utcoffset() is None:
            raise HTTPException(422, "زمان پایان بازه باید منطقه زمانی داشته باشد.")
        query = query.filter(models.AssignedStudyTask.planned_at < end)
    return query


@app.get("/student/weekly-plan")
def student_weekly_plan(
    start: datetime | None = None,
    end: datetime | None = None,
    student: dict = Depends(require_student),
    db: Session = Depends(get_db),
):
    """Return only activities assigned by the student's active mentor or teacher."""
    profile = db.query(models.Student).filter_by(auth_student_id=student["id"]).first()
    mentor_ids = []
    tutor_ids = []
    if profile is not None:
        mentor_ids = [
            row.id for row in db.query(models.MentorAssignment.id)
            .join(models.MentorshipApplication, models.MentorAssignment.application_id == models.MentorshipApplication.id)
            .filter(
                models.MentorshipApplication.student_id == profile.id,
                models.MentorAssignment.status == "active",
            )
            .all()
        ]
        tutor_ids = [
            row.id for row in db.query(models.TutorAssignment.id)
            .join(models.TutoringApplication, models.TutorAssignment.application_id == models.TutoringApplication.id)
            .filter(
                models.TutoringApplication.student_id == profile.id,
                models.TutorAssignment.status == "active",
            )
            .all()
        ]

    items = []

    assigned_query = db.query(models.AssignedStudyTask).filter(
        models.AssignedStudyTask.student_auth_id == student["id"],
        or_(
            models.AssignedStudyTask.mentor_assignment_id.in_(mentor_ids) if mentor_ids else text("1=0"),
            models.AssignedStudyTask.tutor_assignment_id.in_(tutor_ids) if tutor_ids else text("1=0"),
        ),
    )
    assigned_rows = _task_range(assigned_query, start, end).order_by(
        models.AssignedStudyTask.planned_at.asc(), models.AssignedStudyTask.id.asc()
    ).limit(500).all()
    for row in assigned_rows:
        item = _serialize_managed_task(row)
        item["source_type"] = "mentor" if row.mentor_assignment_id is not None else "teacher"
        items.append(item)

    items.sort(key=lambda item: (
        item["planned_at"].replace(tzinfo=timezone.utc)
        if item["planned_at"].tzinfo is None else item["planned_at"],
        item["id"],
    ))
    return {"items": items, "total": len(items)}


@app.patch("/student/weekly-plan/{task_id}")
def update_student_assigned_task_status(
    task_id: int,
    payload: StudentAssignedTaskStatus,
    request: Request,
    student: dict = Depends(require_student),
    db: Session = Depends(get_db),
):
    require_portal_same_origin(request)
    task = db.query(models.AssignedStudyTask).filter_by(
        id=task_id, student_auth_id=student["id"]
    ).first()
    if task is None:
        raise HTTPException(404, "فعالیت برنامه پیدا نشد.")
    if task.mentor_assignment_id is not None:
        assignment = db.get(models.MentorAssignment, task.mentor_assignment_id)
    else:
        assignment = db.get(models.TutorAssignment, task.tutor_assignment_id)
    if assignment is None or assignment.status != "active":
        raise HTTPException(409, "این برنامه دیگر فعال نیست.")
    # The student may only acknowledge completion. Plan content and
    # scheduling remain under mentor/teacher control.
    task.status = "completed"
    task.updated_at = utcnow()
    db.commit()
    db.refresh(task)
    return _serialize_managed_task(task)


def _mentor_assignment_owned(db: Session, assignment_id: int, profile_id: int):
    assignment = db.query(models.MentorAssignment).filter_by(
        id=assignment_id, mentor_id=profile_id
    ).first()
    if assignment is None:
        raise HTTPException(404, "تخصیص منتورینگ پیدا نشد.")
    if assignment.status != "active":
        raise HTTPException(409, "برنامه فقط برای همکاری فعال قابل ویرایش است.")
    application = db.get(models.MentorshipApplication, assignment.application_id)
    if application is None or application.student is None or application.student.auth_student_id is None:
        raise HTTPException(409, "حساب دانش‌آموز به این درخواست متصل نیست.")
    return assignment, application


def _teacher_assignment_owned(db: Session, assignment_id: int, profile_id: int):
    assignment = db.query(models.TutorAssignment).filter_by(
        id=assignment_id, tutor_id=profile_id
    ).first()
    if assignment is None:
        raise HTTPException(404, "تخصیص کلاس خصوصی پیدا نشد.")
    if assignment.status != "active":
        raise HTTPException(409, "برنامه فقط برای همکاری فعال قابل ویرایش است.")
    application = db.get(models.TutoringApplication, assignment.application_id)
    if application is None or application.student is None or application.student.auth_student_id is None:
        raise HTTPException(409, "حساب دانش‌آموز به این درخواست متصل نیست.")
    return assignment, application


@app.get("/mentor/assignments/{assignment_id}/weekly-plan")
def mentor_weekly_plan(
    assignment_id: int,
    start: datetime | None = None,
    end: datetime | None = None,
    mentor: dict = Depends(require_mentor),
    db: Session = Depends(get_db),
):
    assignment, _application = _mentor_assignment_owned(db, assignment_id, mentor["mentor_profile_id"])
    query = db.query(models.AssignedStudyTask).filter_by(mentor_assignment_id=assignment.id)
    rows = _task_range(query, start, end).order_by(
        models.AssignedStudyTask.planned_at.asc(), models.AssignedStudyTask.id.asc()
    ).all()
    return {"items": [_serialize_managed_task(row) for row in rows], "total": len(rows)}


@app.post("/mentor/assignments/{assignment_id}/weekly-plan", status_code=201)
def mentor_create_weekly_task(
    assignment_id: int,
    payload: ManagedStudyTaskCreate,
    request: Request,
    mentor: dict = Depends(require_mentor),
    db: Session = Depends(get_db),
):
    require_portal_same_origin(request)
    assignment, application = _mentor_assignment_owned(db, assignment_id, mentor["mentor_profile_id"])
    task = models.AssignedStudyTask(
        student_auth_id=application.student.auth_student_id,
        mentor_assignment_id=assignment.id,
        **payload.model_dump(),
    )
    db.add(task)
    _notify_student(db, application.student.auth_student_id, "weekly_plan",
                    "فعالیت جدید به برنامه هفتگی اضافه شد",
                    "فعالیت «" + task.title + "» برای برنامه هفتگی‌ات ثبت شد.",
                    "/dashboard/weekly-plan", f"weekly-task:mentor:{assignment.id}:{uuid4().hex}")
    db.commit()
    db.refresh(task)
    return _serialize_managed_task(task)


@app.patch("/mentor/assignments/{assignment_id}/weekly-plan/{task_id}")
def mentor_update_weekly_task(
    assignment_id: int,
    task_id: int,
    payload: ManagedStudyTaskUpdate,
    request: Request,
    mentor: dict = Depends(require_mentor),
    db: Session = Depends(get_db),
):
    require_portal_same_origin(request)
    _mentor_assignment_owned(db, assignment_id, mentor["mentor_profile_id"])
    task = db.query(models.AssignedStudyTask).filter_by(
        id=task_id, mentor_assignment_id=assignment_id
    ).first()
    if task is None:
        raise HTTPException(404, "فعالیت برنامه پیدا نشد.")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(task, key, value)
    task.updated_at = utcnow()
    _notify_student(db, task.student_auth_id, "weekly_plan",
                    "برنامه هفتگی به‌روزرسانی شد",
                    "جزئیات فعالیت «" + task.title + "» تغییر کرده است. برنامه‌ات را مرور کن.",
                    "/dashboard/weekly-plan", f"weekly-task-update:mentor:{task.id}:{uuid4().hex}")
    db.commit()
    db.refresh(task)
    return _serialize_managed_task(task)


@app.delete("/mentor/assignments/{assignment_id}/weekly-plan/{task_id}")
def mentor_delete_weekly_task(
    assignment_id: int,
    task_id: int,
    request: Request,
    mentor: dict = Depends(require_mentor),
    db: Session = Depends(get_db),
):
    require_portal_same_origin(request)
    _mentor_assignment_owned(db, assignment_id, mentor["mentor_profile_id"])
    task = db.query(models.AssignedStudyTask).filter_by(
        id=task_id, mentor_assignment_id=assignment_id
    ).first()
    if task is None:
        raise HTTPException(404, "فعالیت برنامه پیدا نشد.")
    db.delete(task)
    db.commit()
    return {"deleted": True}


@app.get("/teacher/assignments")
def teacher_assignments(
    teacher: dict = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(models.TutorAssignment, models.TutoringApplication)
        .join(models.TutoringApplication, models.TutorAssignment.application_id == models.TutoringApplication.id)
        .filter(
            models.TutorAssignment.tutor_id == teacher["tutor_profile_id"],
            models.TutorAssignment.status.in_(("active", "completed")),
        )
        .order_by(models.TutorAssignment.created_at.desc(), models.TutorAssignment.id.desc())
        .all()
    )
    return {
        "items": [
            {
                "id": assignment.id,
                "application_id": application.id,
                "student_name": application.student.first_name + " " + application.student.last_name,
                "student_auth_id": application.student.auth_student_id,
                "grade": application.student.grade,
                "field": application.field,
                "topic": application.topic,
                "status": assignment.status,
                "start_date": assignment.start_date,
                "end_date": assignment.end_date,
                "person_name": assignment.person_name,
            }
            for assignment, application in rows
        ],
        "total": len(rows),
    }


@app.get("/teacher/assignments/{assignment_id}/weekly-plan")
def teacher_weekly_plan(
    assignment_id: int,
    start: datetime | None = None,
    end: datetime | None = None,
    teacher: dict = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    assignment, _application = _teacher_assignment_owned(db, assignment_id, teacher["tutor_profile_id"])
    rows = _task_range(
        db.query(models.AssignedStudyTask).filter_by(tutor_assignment_id=assignment.id), start, end
    ).order_by(models.AssignedStudyTask.planned_at.asc(), models.AssignedStudyTask.id.asc()).all()
    return {"items": [_serialize_managed_task(row) for row in rows], "total": len(rows)}


@app.post("/teacher/assignments/{assignment_id}/weekly-plan", status_code=201)
def teacher_create_weekly_task(
    assignment_id: int,
    payload: ManagedStudyTaskCreate,
    request: Request,
    teacher: dict = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    require_portal_same_origin(request)
    assignment, application = _teacher_assignment_owned(db, assignment_id, teacher["tutor_profile_id"])
    task = models.AssignedStudyTask(
        student_auth_id=application.student.auth_student_id,
        tutor_assignment_id=assignment.id,
        **payload.model_dump(),
    )
    db.add(task)
    _notify_student(db, application.student.auth_student_id, "weekly_plan",
                    "فعالیت جدید به برنامه هفتگی اضافه شد",
                    "فعالیت «" + task.title + "» برای برنامه هفتگی‌ات ثبت شد.",
                    "/dashboard/weekly-plan", f"weekly-task:teacher:{assignment.id}:{uuid4().hex}")
    db.commit()
    db.refresh(task)
    return _serialize_managed_task(task)


@app.patch("/teacher/assignments/{assignment_id}/weekly-plan/{task_id}")
def teacher_update_weekly_task(
    assignment_id: int,
    task_id: int,
    payload: ManagedStudyTaskUpdate,
    request: Request,
    teacher: dict = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    require_portal_same_origin(request)
    _teacher_assignment_owned(db, assignment_id, teacher["tutor_profile_id"])
    task = db.query(models.AssignedStudyTask).filter_by(
        id=task_id, tutor_assignment_id=assignment_id
    ).first()
    if task is None:
        raise HTTPException(404, "فعالیت برنامه پیدا نشد.")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(task, key, value)
    task.updated_at = utcnow()
    _notify_student(db, task.student_auth_id, "weekly_plan",
                    "برنامه هفتگی به‌روزرسانی شد",
                    "جزئیات فعالیت «" + task.title + "» تغییر کرده است. برنامه‌ات را مرور کن.",
                    "/dashboard/weekly-plan", f"weekly-task-update:teacher:{task.id}:{uuid4().hex}")
    db.commit()
    db.refresh(task)
    return _serialize_managed_task(task)


@app.delete("/teacher/assignments/{assignment_id}/weekly-plan/{task_id}")
def teacher_delete_weekly_task(
    assignment_id: int,
    task_id: int,
    request: Request,
    teacher: dict = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    require_portal_same_origin(request)
    _teacher_assignment_owned(db, assignment_id, teacher["tutor_profile_id"])
    task = db.query(models.AssignedStudyTask).filter_by(
        id=task_id, tutor_assignment_id=assignment_id
    ).first()
    if task is None:
        raise HTTPException(404, "فعالیت برنامه پیدا نشد.")
    db.delete(task)
    db.commit()
    return {"deleted": True}


@app.get("/student/messages/teacher")
def student_teacher_availability(
    student: dict = Depends(require_student),
    db: Session = Depends(get_db),
):
    profile = db.query(models.Student).filter_by(auth_student_id=student["id"]).first()
    if profile is None:
        return {"available": False, "assignment": None}
    row = (
        db.query(models.TutorAssignment, models.TutoringApplication)
        .join(models.TutoringApplication, models.TutorAssignment.application_id == models.TutoringApplication.id)
        .filter(
            models.TutoringApplication.student_id == profile.id,
            models.TutorAssignment.status == "active",
        )
        .order_by(models.TutorAssignment.created_at.desc(), models.TutorAssignment.id.desc())
        .first()
    )
    if row is None:
        return {"available": False, "assignment": None}
    assignment, application = row
    return {
        "available": True,
        "assignment": {
            "id": assignment.id,
            "teacher_name": assignment.person_name,
            "topic": application.topic,
            "field": application.field,
        },
    }


@app.post("/student/messages/teacher", status_code=201)
def create_student_teacher_thread(
    request: Request,
    student: dict = Depends(require_student),
    db: Session = Depends(get_db),
):
    require_portal_same_origin(request)
    profile = db.query(models.Student).filter_by(auth_student_id=student["id"]).first()
    if profile is None:
        raise HTTPException(409, "برای آغاز گفت‌وگو ابتدا یک درخواست کلاس خصوصی ثبت کن.")
    row = (
        db.query(models.TutorAssignment, models.TutoringApplication)
        .join(models.TutoringApplication, models.TutorAssignment.application_id == models.TutoringApplication.id)
        .filter(
            models.TutoringApplication.student_id == profile.id,
            models.TutorAssignment.status == "active",
        )
        .order_by(models.TutorAssignment.created_at.desc(), models.TutorAssignment.id.desc())
        .first()
    )
    if row is None:
        raise HTTPException(409, "هنوز مدرس فعالی به حساب تو اختصاص داده نشده است.")
    assignment, application = row
    thread = db.query(models.StudentMessageThread).filter_by(
        student_auth_id=student["id"],
        channel="teacher",
        tutor_assignment_id=assignment.id,
    ).first()
    if thread is None:
        thread = models.StudentMessageThread(
            student_auth_id=student["id"],
            student_name=(student["first_name"] + " " + student["last_name"])[:180],
            channel="teacher",
            tutor_assignment_id=assignment.id,
            subject=("گفت‌وگو با " + (assignment.person_name or "مدرس خصوصی"))[:140],
            status="open",
            last_message_at=utcnow(),
        )
        db.add(thread)
        try:
            db.commit()
            db.refresh(thread)
        except IntegrityError:
            db.rollback()
            thread = db.query(models.StudentMessageThread).filter_by(
                student_auth_id=student["id"],
                channel="teacher",
                tutor_assignment_id=assignment.id,
            ).first()
            if thread is None:
                raise HTTPException(503, "ساخت گفت‌وگو با مدرس انجام نشد.")
    elif thread.status == "closed":
        thread.status = "open"
        thread.updated_at = utcnow()
        db.commit()
        db.refresh(thread)
    return {
        "id": thread.id,
        "channel": thread.channel,
        "tutor_assignment_id": thread.tutor_assignment_id,
        "subject": thread.subject,
        "status": thread.status,
        "last_message_at": thread.last_message_at,
    }


def _teacher_thread_for_user(db: Session, thread_id: int, tutor_profile_id: int):
    thread = (
        db.query(models.StudentMessageThread)
        .join(models.TutorAssignment, models.StudentMessageThread.tutor_assignment_id == models.TutorAssignment.id)
        .filter(
            models.StudentMessageThread.id == thread_id,
            models.StudentMessageThread.channel == "teacher",
            models.TutorAssignment.tutor_id == tutor_profile_id,
            models.TutorAssignment.status.in_(("active", "completed")),
        )
        .first()
    )
    if thread is None:
        raise HTTPException(404, "گفت‌وگو پیدا نشد.")
    return thread


@app.get("/teacher/messages/threads")
def teacher_message_threads(
    teacher: dict = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(models.StudentMessageThread, models.TutoringApplication)
        .join(models.TutorAssignment, models.StudentMessageThread.tutor_assignment_id == models.TutorAssignment.id)
        .join(models.TutoringApplication, models.TutorAssignment.application_id == models.TutoringApplication.id)
        .filter(
            models.TutorAssignment.tutor_id == teacher["tutor_profile_id"],
            models.TutorAssignment.status.in_(("active", "completed")),
            models.StudentMessageThread.channel == "teacher",
        )
        .order_by(models.StudentMessageThread.last_message_at.desc())
        .limit(200)
        .all()
    )
    return {
        "items": [
            {
                "id": thread.id,
                "channel": thread.channel,
                "subject": thread.subject,
                "student_name": thread.student_name,
                "status": thread.status,
                "last_message_at": thread.last_message_at,
                "unread_count": _unread_count(db, thread.id, "teacher"),
                "topic": application.topic,
                "field": application.field,
            }
            for thread, application in rows
        ],
        "total": len(rows),
    }


@app.get("/teacher/messages/threads/{thread_id}/messages")
def teacher_thread_messages(
    thread_id: int,
    teacher: dict = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    thread = _teacher_thread_for_user(db, thread_id, teacher["tutor_profile_id"])
    messages = db.query(models.StudentMessage).filter_by(thread_id=thread.id).order_by(
        models.StudentMessage.created_at.asc(), models.StudentMessage.id.asc()
    ).limit(300).all()
    now = utcnow()
    for message in messages:
        if message.sender_type == "student" and message.read_at is None:
            message.read_at = now
    db.commit()
    return {"items": [_serialize_message(message) for message in messages], "total": len(messages)}


@app.post("/teacher/messages/threads/{thread_id}/messages", status_code=201)
async def teacher_send_message(
    thread_id: int,
    payload: StudentMessageCreate,
    request: Request,
    teacher: dict = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    require_portal_same_origin(request)
    thread = _teacher_thread_for_user(db, thread_id, teacher["tutor_profile_id"])
    assignment = db.get(models.TutorAssignment, thread.tutor_assignment_id)
    if thread.status != "open" or assignment is None or assignment.status != "active":
        raise HTTPException(409, "این گفت‌وگو در حال حاضر برای ارسال پیام فعال نیست.")
    message = models.StudentMessage(
        thread_id=thread.id,
        sender_type="teacher",
        sender_id=teacher["id"],
        body=payload.body,
    )
    thread.last_message_at = utcnow()
    thread.updated_at = utcnow()
    db.add(message)
    _notify_student(db, thread.student_auth_id, "message", "پیام جدید از مدرس",
                    "در گفت‌وگوی «" + thread.subject + "» پیام تازه‌ای دریافت کردی.",
                    "/dashboard/messages", f"thread:{thread.id}:message:{uuid4().hex}")
    try:
        db.commit()
        db.refresh(message)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(503, "ارسال پیام انجام نشد.") from exc
    serialized = _serialize_message(message)
    await message_connections.broadcast(thread.id, {"type": "message", "message": serialized})
    return serialized
