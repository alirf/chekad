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
    StudentMessageCreate,
    StudentMessageThreadCreate,
    StudentStudyReportCreate,
    StudentStudyTaskCreate,
    StudentStudyTaskUpdate,
    TutoringApplicationCreate,
)

app = FastAPI(
    title=f"Chekad {settings.service_name}",
    version="0.5.0",
    description="Student-facing portal, messaging and study workflow for Chekad.",
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
        if message.sender_type == "admin" and message.read_at is None:
            message.read_at = now
    db.commit()
    return {"items": [_serialize_message(message) for message in messages], "total": len(messages)}


@app.post("/student/messages/threads/{thread_id}/messages", status_code=201)
def student_send_message(
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
    return _serialize_message(message)


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
        if message.sender_type == "student" and message.read_at is None:
            message.read_at = now
    db.commit()
    return {"items": [_serialize_message(message) for message in messages], "total": len(messages)}


@app.post("/admin/messages/threads/{thread_id}/messages", status_code=201)
def admin_send_message(
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
    try:
        db.commit()
        db.refresh(message)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(503, "ارسال پیام انجام نشد.") from exc
    return _serialize_message(message)


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


def _serialize_study_task(task: models.StudentStudyTask) -> dict:
    return {
        "id": task.id,
        "title": task.title,
        "description": task.description,
        "planned_at": task.planned_at,
        "duration_minutes": task.duration_minutes,
        "status": task.status,
        "created_at": task.created_at,
        "updated_at": task.updated_at,
    }


@app.get("/student/study-tasks")
def student_study_tasks(
    start: datetime | None = None,
    end: datetime | None = None,
    student: dict = Depends(require_student),
    db: Session = Depends(get_db),
):
    query = db.query(models.StudentStudyTask).filter_by(student_auth_id=student["id"])
    if start is not None:
        query = query.filter(models.StudentStudyTask.planned_at >= start)
    if end is not None:
        query = query.filter(models.StudentStudyTask.planned_at < end)
    rows = query.order_by(models.StudentStudyTask.planned_at.asc()).limit(250).all()
    return {"items": [_serialize_study_task(row) for row in rows], "total": len(rows)}


@app.post("/student/study-tasks", status_code=201)
def create_student_study_task(
    payload: StudentStudyTaskCreate,
    request: Request,
    student: dict = Depends(require_student),
    db: Session = Depends(get_db),
):
    require_portal_same_origin(request)
    task = models.StudentStudyTask(
        student_auth_id=student["id"],
        **payload.model_dump(),
    )
    db.add(task)
    try:
        db.commit()
        db.refresh(task)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(503, "ثبت برنامه انجام نشد.") from exc
    return _serialize_study_task(task)


@app.patch("/student/study-tasks/{task_id}")
def update_student_study_task(
    task_id: int,
    payload: StudentStudyTaskUpdate,
    request: Request,
    student: dict = Depends(require_student),
    db: Session = Depends(get_db),
):
    require_portal_same_origin(request)
    task = db.query(models.StudentStudyTask).filter_by(id=task_id, student_auth_id=student["id"]).first()
    if task is None:
        raise HTTPException(404, "فعالیت برنامه پیدا نشد.")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(task, key, value)
    task.updated_at = utcnow()
    try:
        db.commit()
        db.refresh(task)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(503, "به‌روزرسانی برنامه انجام نشد.") from exc
    return _serialize_study_task(task)


@app.delete("/student/study-tasks/{task_id}", status_code=204)
def delete_student_study_task(
    task_id: int,
    request: Request,
    student: dict = Depends(require_student),
    db: Session = Depends(get_db),
):
    require_portal_same_origin(request)
    task = db.query(models.StudentStudyTask).filter_by(id=task_id, student_auth_id=student["id"]).first()
    if task is None:
        raise HTTPException(404, "فعالیت برنامه پیدا نشد.")
    db.delete(task)
    db.commit()
    return Response(status_code=204)


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

    tasks = (
        db.query(models.StudentStudyTask)
        .filter_by(student_auth_id=student["id"])
        .order_by(models.StudentStudyTask.planned_at.asc())
        .limit(250)
        .all()
    )
    for task in tasks:
        events.append({
            "id": "task-" + str(task.id),
            "category": "study",
            "title": task.title,
            "starts_at": task.planned_at,
            "duration_minutes": task.duration_minutes,
            "status": task.status,
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
    assignments = (
        db.query(models.TutorAssignment, models.TutoringApplication)
        .join(models.TutoringApplication, models.TutorAssignment.application_id == models.TutoringApplication.id)
        .filter(
            models.TutoringApplication.student_id == profile.id,
            models.TutorAssignment.status == "active",
        )
        .all()
    )
    items = []
    for assignment, application in assignments:
        sessions = (
            db.query(models.TutorSession)
            .filter_by(assignment_id=assignment.id)
            .order_by(models.TutorSession.scheduled_at.asc())
            .all()
        )
        items.append({
            "assignment_id": assignment.id,
            "topic": application.topic,
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
    return {"items": items, "total": len(items)}
