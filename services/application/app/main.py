import hashlib
import json
import re
from datetime import datetime, timezone
from urllib.parse import urlsplit

import httpx
from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request, Response, status
from sqlalchemy import or_, text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session, joinedload

from app.config import settings
from app.db import engine, get_db
from app import models
from app.schemas import (
    AdminApplicationStatusUpdate,
    InternalNoteCreate,
    MentorshipApplicationCreate,
    PublicApplicationCreated,
    TutoringApplicationCreate,
)

app = FastAPI(
    title=f"Chekad {settings.service_name}",
    version="0.4.0",
    description="Public application intake and admin workflow for Chekad.",
)
PRIVACY_NOTICE_VERSION = "2026-11-28-v3"
APPLICATION_STATUSES = {
    "new", "reviewing", "waiting_for_student", "options_proposed",
    "accepted", "active", "completed", "rejected", "cancelled",
}


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def require_public_intake() -> None:
    email = settings.privacy_contact_email.strip()
    origin = urlsplit(settings.public_site_origin.strip())
    secure_origin = (
        origin.scheme == "https" and bool(origin.netloc)
        and origin.path in ("", "/") and not origin.query and not origin.fragment
        and not origin.username and not origin.password
    )
    if (
        not settings.public_applications_enabled
        or not settings.terms_approved
        or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email)
        or not secure_origin
    ):
        raise HTTPException(
            status_code=503,
            detail="ثبت درخواست تا زمان تنظیم حریم خصوصی، شرایط خدمات و نشانی رسمی فعال نمی‌شود.",
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
    student.parent_phone = authenticated_student["guardian_phone"]
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
    row.status = payload.status
    if payload.status == "rejected":
        row.reject_reason = payload.reject_reason
    elif payload.reject_reason is not None:
        raise HTTPException(422, "دلیل رد فقط برای وضعیت ردشده قابل ثبت است.")
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
