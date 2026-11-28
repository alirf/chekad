from datetime import datetime, timedelta, timezone
import os
from pathlib import Path
import re
from typing import Literal
from urllib.parse import urlsplit
from uuid import uuid4

import httpx
from fastapi import Depends, FastAPI, File, HTTPException, Query, Request, Response, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field, field_validator, model_validator
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.config import settings
from app.db import engine, get_db
from app import models

app = FastAPI(title=f"Chekad {settings.service_name}", version="0.3.0")


async def require_admin(request: Request) -> dict:
    if request.method not in {"GET", "HEAD", "OPTIONS"}:
        origin = request.headers.get("origin")
        parsed = urlsplit(origin or "")
        configured = urlsplit(settings.public_site_origin.strip())
        if not origin or parsed.scheme not in {"http", "https"} or not parsed.netloc or parsed.path not in ("", "/") or parsed.query or parsed.fragment or parsed.username or parsed.password:
            raise HTTPException(403, "مبدأ درخواست مدیریتی معتبر نیست.")
        if configured.scheme and configured.netloc:
            matches = f"{parsed.scheme}://{parsed.netloc}".lower() == f"{configured.scheme}://{configured.netloc}".lower()
        else:
            host = request.headers.get("x-forwarded-host") or request.headers.get("host", "")
            proto = request.headers.get("x-forwarded-proto") or request.url.scheme
            matches = parsed.netloc.lower() == host.lower() and parsed.scheme.lower() == proto.lower()
        if not matches:
            raise HTTPException(403, "مبدأ درخواست مدیریتی با وب‌سایت چکاد مطابقت ندارد.")
    headers = {}
    if request.headers.get("cookie"):
        headers["Cookie"] = request.headers["cookie"]
    if request.headers.get("authorization"):
        headers["Authorization"] = request.headers["authorization"]
    if not headers:
        raise HTTPException(401, "احراز هویت مدیر لازم است.")
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            response = await client.get(settings.auth_internal_url.rstrip("/") + "/me", headers=headers)
    except httpx.RequestError as exc:
        raise HTTPException(503, "سرویس احراز هویت در دسترس نیست.") from exc
    if response.status_code != 200:
        raise HTTPException(401, "نشست مدیر معتبر نیست.")
    admin = response.json()
    if not isinstance(admin, dict) or not isinstance(admin.get("id"), int):
        raise HTTPException(503, "پاسخ سرویس احراز هویت معتبر نیست.")
    return admin


def health_payload():
    db_status = "ok"
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except Exception as exc:
        db_status = f"error:{exc.__class__.__name__}"
    return {"status": "ok", "service": settings.service_name, "db": db_status}


@app.get("/health")
def health():
    return health_payload()


class PageInput(BaseModel):
    slug: str = Field(min_length=1, max_length=120, pattern=r"^[a-z0-9][a-z0-9-]*$")
    title: str = Field(min_length=1, max_length=240)
    description: str = ""
    content: str = ""
    sections: list[dict] = Field(default_factory=list, max_length=40)
    layout: Literal["standard", "wide", "narrow", "split"] = "standard"
    image_url: str | None = None
    seo_title: str | None = Field(default=None, max_length=240)
    seo_description: str | None = Field(default=None, max_length=320)
    status: Literal["draft", "published"] = "draft"

    @field_validator("sections")
    @classmethod
    def validate_sections(cls, value):
        allowed = {"heading", "text", "image", "features", "cta"}
        for block in value:
            if not isinstance(block, dict) or block.get("type") not in allowed:
                raise ValueError("ساختار یکی از بخش‌های صفحه معتبر نیست.")
            for key in ("image_url", "url"):
                link = block.get(key)
                if link and not (isinstance(link, str) and ((key == "url" and link.startswith("/") and not link.startswith("//") and "\\\\" not in link) or (link.startswith("/api/content/media/") and ".." not in link) or (urlsplit(link).scheme == "https" and urlsplit(link).netloc and not urlsplit(link).username and not urlsplit(link).password))):
                    raise ValueError("نشانی رسانه باید HTTPS یا مسیر رسانه داخلی باشد.")
        return value


class ArticleInput(BaseModel):
    slug: str = Field(min_length=1, max_length=160, pattern=r"^[a-z0-9][a-z0-9-]*$")
    title: str = Field(min_length=1, max_length=240)
    excerpt: str = ""
    body: str = ""
    category: str = "عمومی"
    tags: str = ""
    cover_image_url: str | None = None
    status: Literal["draft", "published"] = "draft"


class ExamInput(BaseModel):
    slug: str = Field(min_length=1, max_length=160, pattern=r"^[a-z0-9][a-z0-9-]*$")
    title: str = Field(min_length=1, max_length=240)
    description: str = ""
    field: Literal["physics", "computer"]
    stage: str = ""
    starts_at: str = ""
    duration_minutes: int = Field(default=0, ge=0, le=10000)
    registration_url: str | None = None
    status: Literal["draft", "published", "upcoming", "closed", "completed"] = "draft"
    cover_image_url: str | None = None

    @field_validator("registration_url")
    @classmethod
    def validate_registration_url(cls, value):
        if not value:
            return value
        parsed = urlsplit(value)
        safe_path = value.startswith("/") and not value.startswith("//") and "\\\\" not in value
        safe_https = parsed.scheme == "https" and parsed.netloc and not parsed.username and not parsed.password
        if not (safe_path or safe_https):
            raise ValueError("لینک ثبت‌نام باید HTTPS یا مسیر داخلی معتبر باشد.")
        return value


def image_url_is_safe(value: str | None) -> None:
    if value is None or value == "":
        return
    parsed = urlsplit(value)
    internal_media = value.startswith("/api/content/media/") and ".." not in value and "\\\\" not in value
    if not internal_media and (parsed.scheme not in ("https",) or not parsed.netloc or parsed.username or parsed.password):
        raise HTTPException(422, "نشانی تصویر باید HTTPS یا مسیر رسانه داخلی باشد.")


def page_dict(row):
    return {k: getattr(row, k) for k in ("id", "slug", "title", "description", "content", "sections", "layout", "image_url", "seo_title", "seo_description", "status", "updated_at")}


def article_dict(row):
    return {k: getattr(row, k) for k in ("id", "slug", "title", "excerpt", "body", "category", "tags", "cover_image_url", "status", "published_at", "updated_at")}


def exam_dict(row):
    return {k: getattr(row, k) for k in ("id", "slug", "title", "description", "field", "stage", "starts_at", "duration_minutes", "registration_url", "status", "cover_image_url", "results_published", "updated_at")}





MEDIA_DIR = Path(os.getenv("MEDIA_DIR", "/data/media"))
MAX_IMAGE_BYTES = 5 * 1024 * 1024


@app.post("/admin/media", status_code=201)
async def upload_media(file: UploadFile = File(...), _: dict = Depends(require_admin)):
    """Upload a raster image; SVG and arbitrary files are intentionally rejected."""
    if file.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(415, "فقط تصویرهای JPEG، PNG و WebP پذیرفته می‌شوند.")
    content = await file.read(MAX_IMAGE_BYTES + 1)
    if len(content) > MAX_IMAGE_BYTES:
        raise HTTPException(413, "حجم تصویر نباید بیشتر از ۵ مگابایت باشد.")
    signatures = {
        "image/jpeg": (content.startswith(b"\xff\xd8\xff"), "jpg"),
        "image/png": (content.startswith(b"\x89PNG\r\n\x1a\n"), "png"),
        "image/webp": (len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP", "webp"),
    }
    valid, extension = signatures[file.content_type]
    if not valid:
        raise HTTPException(415, "محتوای فایل با نوع تصویر اعلام‌شده مطابقت ندارد.")
    MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid4().hex}.{extension}"
    destination = MEDIA_DIR / filename
    destination.write_bytes(content)
    return {"url": f"/api/content/media/{filename}", "filename": filename, "size": len(content)}


@app.get("/media/{filename}")
def get_media(filename: str):
    if not re.fullmatch(r"[a-f0-9]{32}\.(jpg|png|webp)", filename):
        raise HTTPException(404, "media not found")
    path = MEDIA_DIR / filename
    if not path.is_file():
        raise HTTPException(404, "media not found")
    media_type = {"jpg": "image/jpeg", "png": "image/png", "webp": "image/webp"}[path.suffix[1:]]
    return FileResponse(path, media_type=media_type, headers={"X-Content-Type-Options": "nosniff", "Cache-Control": "public, max-age=31536000, immutable"})


@app.get("/pages")
def public_pages(db: Session = Depends(get_db)):
    return [page_dict(x) for x in db.query(models.SitePage).filter_by(status="published").order_by(models.SitePage.title).all()]


@app.get("/pages/{slug}")
def public_page(slug: str, db: Session = Depends(get_db)):
    row = db.query(models.SitePage).filter_by(slug=slug, status="published").first()
    if not row:
        raise HTTPException(404, "page not found")
    return page_dict(row)


@app.get("/articles")
def public_articles(q: str | None = None, category: str | None = None, db: Session = Depends(get_db)):
    query = db.query(models.Article).filter_by(status="published")
    if category:
        query = query.filter(models.Article.category == category)
    if q:
        pattern = "%" + q[:100] + "%"
        query = query.filter((models.Article.title.ilike(pattern)) | (models.Article.excerpt.ilike(pattern)))
    return [article_dict(x) for x in query.order_by(models.Article.published_at.desc(), models.Article.id.desc()).all()]


@app.get("/articles/{slug}")
def public_article(slug: str, db: Session = Depends(get_db)):
    row = db.query(models.Article).filter_by(slug=slug, status="published").first()
    if not row:
        raise HTTPException(404, "article not found")
    return article_dict(row)


@app.get("/exams")
def public_exams(field: str | None = None, status: str | None = None, db: Session = Depends(get_db)):
    query = db.query(models.Exam).filter(models.Exam.status != "draft")
    if field in ("physics", "computer"):
        query = query.filter(models.Exam.field == field)
    if status in ("published", "upcoming", "closed", "completed"):
        query = query.filter(models.Exam.status == status)
    return [exam_dict(x) for x in query.order_by(models.Exam.id.desc()).all()]


@app.get("/admin/pages")
def admin_pages(db: Session = Depends(get_db), _: dict = Depends(require_admin)):
    return [page_dict(x) for x in db.query(models.SitePage).order_by(models.SitePage.id.desc()).all()]


@app.post("/admin/pages", status_code=201)
def create_page(payload: PageInput, db: Session = Depends(get_db), _: dict = Depends(require_admin)):
    image_url_is_safe(payload.image_url)
    if db.query(models.SitePage).filter_by(slug=payload.slug).first():
        raise HTTPException(409, "این شناسه صفحه قبلاً استفاده شده است.")
    row = models.SitePage(**payload.model_dump())
    db.add(row); db.commit(); db.refresh(row)
    return page_dict(row)


@app.put("/admin/pages/{page_id}")
def update_page(page_id: int, payload: PageInput, db: Session = Depends(get_db), _: dict = Depends(require_admin)):
    image_url_is_safe(payload.image_url)
    row = db.get(models.SitePage, page_id)
    if not row:
        raise HTTPException(404, "page not found")
    conflict = db.query(models.SitePage).filter(models.SitePage.slug == payload.slug, models.SitePage.id != page_id).first()
    if conflict:
        raise HTTPException(409, "این شناسه صفحه قبلاً استفاده شده است.")
    for key, value in payload.model_dump().items(): setattr(row, key, value)
    db.commit(); db.refresh(row)
    return page_dict(row)


@app.delete("/admin/pages/{page_id}")
def delete_page(page_id: int, db: Session = Depends(get_db), _: dict = Depends(require_admin)):
    row = db.get(models.SitePage, page_id)
    if not row:
        raise HTTPException(404, "page not found")
    db.delete(row); db.commit()
    return {"deleted": True}


@app.get("/admin/articles")
def admin_articles(db: Session = Depends(get_db), _: dict = Depends(require_admin)):
    return [article_dict(x) for x in db.query(models.Article).order_by(models.Article.id.desc()).all()]


@app.post("/admin/articles", status_code=201)
def create_article(payload: ArticleInput, db: Session = Depends(get_db), _: dict = Depends(require_admin)):
    image_url_is_safe(payload.cover_image_url)
    if db.query(models.Article).filter_by(slug=payload.slug).first():
        raise HTTPException(409, "این شناسه مقاله قبلاً استفاده شده است.")
    data = payload.model_dump()
    if data["status"] == "published": data["published_at"] = datetime.now(timezone.utc)
    row = models.Article(**data)
    db.add(row); db.commit(); db.refresh(row)
    return article_dict(row)


@app.put("/admin/articles/{article_id}")
def update_article(article_id: int, payload: ArticleInput, db: Session = Depends(get_db), _: dict = Depends(require_admin)):
    image_url_is_safe(payload.cover_image_url)
    row = db.get(models.Article, article_id)
    if not row: raise HTTPException(404, "article not found")
    conflict = db.query(models.Article).filter(models.Article.slug == payload.slug, models.Article.id != article_id).first()
    if conflict: raise HTTPException(409, "این شناسه مقاله قبلاً استفاده شده است.")
    data = payload.model_dump()
    if data["status"] == "published" and row.published_at is None: data["published_at"] = datetime.now(timezone.utc)
    for key, value in data.items(): setattr(row, key, value)
    db.commit(); db.refresh(row)
    return article_dict(row)


@app.delete("/admin/articles/{article_id}")
def delete_article(article_id: int, db: Session = Depends(get_db), _: dict = Depends(require_admin)):
    row = db.get(models.Article, article_id)
    if not row:
        raise HTTPException(404, "article not found")
    db.delete(row); db.commit()
    return {"deleted": True}


@app.get("/admin/exams")
def admin_exams(db: Session = Depends(get_db), _: dict = Depends(require_admin)):
    return [exam_dict(x) for x in db.query(models.Exam).order_by(models.Exam.id.desc()).all()]


@app.post("/admin/exams", status_code=201)
def create_exam(payload: ExamInput, db: Session = Depends(get_db), _: dict = Depends(require_admin)):
    image_url_is_safe(payload.cover_image_url)
    if db.query(models.Exam).filter_by(slug=payload.slug).first(): raise HTTPException(409, "این شناسه آزمون قبلاً استفاده شده است.")
    row = models.Exam(**payload.model_dump())
    db.add(row); db.commit(); db.refresh(row)
    return exam_dict(row)


@app.put("/admin/exams/{exam_id}")
def update_exam(exam_id: int, payload: ExamInput, db: Session = Depends(get_db), _: dict = Depends(require_admin)):
    image_url_is_safe(payload.cover_image_url)
    row = db.get(models.Exam, exam_id)
    if not row: raise HTTPException(404, "exam not found")
    conflict = db.query(models.Exam).filter(models.Exam.slug == payload.slug, models.Exam.id != exam_id).first()
    if conflict: raise HTTPException(409, "این شناسه آزمون قبلاً استفاده شده است.")
    for key, value in payload.model_dump().items(): setattr(row, key, value)
    db.commit(); db.refresh(row)
    return exam_dict(row)


@app.delete("/admin/exams/{exam_id}")
def delete_exam(exam_id: int, db: Session = Depends(get_db), _: dict = Depends(require_admin)):
    row = db.get(models.Exam, exam_id)
    if not row:
        raise HTTPException(404, "exam not found")
    db.delete(row); db.commit()
    return {"deleted": True}


async def require_student(request: Request) -> dict:
    headers = {}
    if request.headers.get("cookie"):
        headers["Cookie"] = request.headers["cookie"]
    if request.headers.get("authorization"):
        headers["Authorization"] = request.headers["authorization"]
    if not headers:
        raise HTTPException(401, "برای استفاده از آزمون‌ها وارد حساب دانش‌آموزی شوید.")
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
    if (
        not isinstance(student, dict)
        or not isinstance(student.get("id"), int)
        or student.get("field") not in {"physics", "computer"}
    ):
        raise HTTPException(503, "اطلاعات حساب دانش‌آموزی کامل نیست.")
    return student


def require_content_same_origin(request: Request) -> None:
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
        raise HTTPException(403, "درخواست باید از همان وب‌سایت چکاد ارسال شود.")


def student_exam_dict(exam, registration):
    return {
        **exam_dict(exam),
        "registration_status": registration.status if registration else None,
        "is_registered": bool(registration and registration.status == "registered"),
        "can_register": exam.status in {"published", "upcoming"},
        "registered_at": registration.registered_at if registration and registration.status == "registered" else None,
    }


@app.get("/student/exams")
def student_exams(
    student: dict = Depends(require_student),
    db: Session = Depends(get_db),
):
    exams = (
        db.query(models.Exam)
        .filter(
            models.Exam.field == student["field"],
            models.Exam.status.in_(("published", "upcoming", "closed", "completed")),
        )
        .order_by(models.Exam.id.desc())
        .all()
    )
    registrations = {
        row.exam_id: row
        for row in db.query(models.ExamRegistration)
        .filter_by(student_auth_id=student["id"])
        .all()
    }
    return {
        "items": [student_exam_dict(exam, registrations.get(exam.id)) for exam in exams],
        "total": len(exams),
    }


@app.post("/student/exams/{exam_id}/register", status_code=201)
def register_student_for_exam(
    exam_id: int,
    request: Request,
    response: Response,
    student: dict = Depends(require_student),
    db: Session = Depends(get_db),
):
    require_content_same_origin(request)
    exam = db.get(models.Exam, exam_id)
    if exam is None or exam.status == "draft":
        raise HTTPException(404, "آزمون پیدا نشد.")
    if exam.field != student["field"]:
        raise HTTPException(403, "این آزمون برای رشته المپیاد حساب تو نیست.")
    if exam.status not in {"published", "upcoming"}:
        raise HTTPException(409, "مهلت ثبت‌نام این آزمون فعال نیست.")

    registration = (
        db.query(models.ExamRegistration)
        .filter_by(exam_id=exam.id, student_auth_id=student["id"])
        .first()
    )
    now = datetime.now(timezone.utc)
    if registration is None:
        registration = models.ExamRegistration(
            exam_id=exam.id,
            student_auth_id=student["id"],
            status="registered",
            registered_at=now,
        )
        db.add(registration)
    elif registration.status == "registered":
        response.status_code = 200
        return {
            "id": registration.id,
            "exam_id": exam.id,
            "status": registration.status,
            "registered_at": registration.registered_at,
        }
    else:
        registration.status = "registered"
        registration.registered_at = now
        registration.cancelled_at = None
        registration.updated_at = now

    try:
        db.commit()
        db.refresh(registration)
    except IntegrityError as exc:
        db.rollback()
        existing = (
            db.query(models.ExamRegistration)
            .filter_by(exam_id=exam.id, student_auth_id=student["id"], status="registered")
            .first()
        )
        if existing is not None:
            response.status_code = 200
            registration = existing
        else:
            raise HTTPException(503, "ثبت‌نام در آزمون انجام نشد.") from exc
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(503, "ثبت‌نام در آزمون انجام نشد.") from exc
    return {
        "id": registration.id,
        "exam_id": exam.id,
        "status": registration.status,
        "registered_at": registration.registered_at,
    }


@app.delete("/student/exams/{exam_id}/register")
def cancel_student_exam_registration(
    exam_id: int,
    request: Request,
    student: dict = Depends(require_student),
    db: Session = Depends(get_db),
):
    require_content_same_origin(request)
    registration = (
        db.query(models.ExamRegistration)
        .filter_by(exam_id=exam_id, student_auth_id=student["id"], status="registered")
        .first()
    )
    if registration is None:
        raise HTTPException(404, "ثبت‌نام فعالی برای این آزمون پیدا نشد.")
    now = datetime.now(timezone.utc)
    registration.status = "cancelled"
    registration.cancelled_at = now
    registration.updated_at = now
    db.commit()
    return {"exam_id": exam_id, "status": "cancelled"}


@app.get("/admin/exam-registrations")
def admin_exam_registrations(
    exam_id: int | None = None,
    registration_status: str | None = Query(default=None, alias="status", pattern="^(registered|cancelled)$"),
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    query = db.query(models.ExamRegistration, models.Exam).join(
        models.Exam, models.ExamRegistration.exam_id == models.Exam.id
    )
    if exam_id is not None:
        query = query.filter(models.ExamRegistration.exam_id == exam_id)
    if registration_status:
        query = query.filter(models.ExamRegistration.status == registration_status)
    rows = query.order_by(models.ExamRegistration.registered_at.desc()).limit(500).all()
    return {
        "items": [
            {
                "id": registration.id,
                "exam_id": exam.id,
                "exam_title": exam.title,
                "field": exam.field,
                "student_auth_id": registration.student_auth_id,
                "status": registration.status,
                "registered_at": registration.registered_at,
                "cancelled_at": registration.cancelled_at,
            }
            for registration, exam in rows
        ],
        "total": len(rows),
    }


class ExamQuestionInput(BaseModel):
    position: int = Field(default=1, ge=1, le=500)
    question_type: Literal["single_choice", "written"]
    prompt: str = Field(min_length=5, max_length=6000)
    options: list[str] | None = Field(default=None, min_length=2, max_length=8)
    correct_answer: str | None = Field(default=None, max_length=1000)
    points: int = Field(default=1, ge=1, le=100)

    @field_validator("prompt")
    @classmethod
    def clean_prompt(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 5:
            raise ValueError("متن سؤال کوتاه است.")
        return value

    @field_validator("options")
    @classmethod
    def clean_options(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return None
        cleaned = [item.strip() for item in value]
        if any(not item for item in cleaned) or len(set(cleaned)) != len(cleaned):
            raise ValueError("گزینه‌های سؤال باید غیرخالی و یکتا باشند.")
        return cleaned

    @field_validator("correct_answer")
    @classmethod
    def clean_correct_answer(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else None

    @field_validator("question_type")
    @classmethod
    def valid_question_type(cls, value: str) -> str:
        if value not in {"single_choice", "written"}:
            raise ValueError("نوع سؤال معتبر نیست.")
        return value

    @model_validator(mode="after")
    def validate_question_rules(self):
        if self.question_type == "single_choice":
            if not self.options or len(self.options) < 2:
                raise ValueError("سؤال چهارگزینه‌ای باید حداقل دو گزینه داشته باشد.")
            if not self.correct_answer or self.correct_answer not in self.options:
                raise ValueError("پاسخ صحیح باید یکی از گزینه‌ها باشد.")
        elif self.options is not None or self.correct_answer is not None:
            raise ValueError("سؤال تشریحی نباید گزینه یا پاسخ صحیح خودکار داشته باشد.")
        return self


class ExamAnswerInput(BaseModel):
    question_id: int = Field(ge=1)
    answer_text: str = Field(default="", max_length=12000)


class ExamAnswersSave(BaseModel):
    answers: list[ExamAnswerInput] = Field(max_length=100)


class ExamAnswerGradeInput(BaseModel):
    earned_points: int = Field(ge=0, le=100)
    grader_note: str | None = Field(default=None, max_length=2000)


class ExamResultsPublicationInput(BaseModel):
    results_published: bool


def _parse_exam_start(exam) -> datetime:
    raw = (exam.starts_at or "").strip()
    if not raw:
        raise HTTPException(409, "زمان شروع این آزمون هنوز مشخص نشده است.")
    try:
        value = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError as exc:
        raise HTTPException(409, "زمان شروع آزمون معتبر نیست.") from exc
    if value.tzinfo is None or value.utcoffset() is None:
        raise HTTPException(409, "زمان شروع آزمون باید منطقه زمانی داشته باشد.")
    return value


def _public_question(question, answer=None):
    item = {
        "id": question.id,
        "position": question.position,
        "question_type": question.question_type,
        "prompt": question.prompt,
        "options": question.options,
        "points": question.points,
    }
    if answer is not None:
        item["answer_text"] = answer.answer_text
    return item


def _serialize_attempt(attempt, exam):
    return {
        "id": attempt.id,
        "exam_id": attempt.exam_id,
        "status": attempt.status,
        "started_at": attempt.started_at,
        "deadline_at": attempt.deadline_at,
        "submitted_at": attempt.submitted_at,
        "max_score": attempt.max_score,
        "earned_score": attempt.earned_score if exam.results_published and attempt.status == "graded" else None,
        "results_published": bool(exam.results_published and attempt.status == "graded"),
    }


def _finalize_exam_attempt(db: Session, attempt, exam) -> None:
    questions = (
        db.query(models.ExamQuestion)
        .filter_by(exam_id=exam.id)
        .order_by(models.ExamQuestion.position.asc(), models.ExamQuestion.id.asc())
        .all()
    )
    existing = {
        row.question_id: row
        for row in db.query(models.ExamAnswer).filter_by(attempt_id=attempt.id).all()
    }
    for question in questions:
        answer = existing.get(question.id)
        if answer is None:
            answer = models.ExamAnswer(attempt_id=attempt.id, question_id=question.id, answer_text="")
            db.add(answer)
            existing[question.id] = answer
        if question.question_type == "single_choice":
            answer.is_correct = answer.answer_text == question.correct_answer
            answer.earned_points = question.points if answer.is_correct else 0
            answer.graded_at = datetime.now(timezone.utc)
        elif not answer.answer_text.strip():
            answer.earned_points = 0
            answer.graded_at = datetime.now(timezone.utc)
    attempt.max_score = sum(question.points for question in questions)
    answer_rows = list(existing.values())
    attempt.earned_score = sum(row.earned_points or 0 for row in answer_rows if row.earned_points is not None)
    pending_written = any(
        question.question_type == "written"
        and existing[question.id].answer_text.strip()
        and existing[question.id].earned_points is None
        for question in questions
    )
    attempt.status = "submitted" if pending_written else "graded"
    attempt.submitted_at = datetime.now(timezone.utc)
    attempt.graded_at = None if pending_written else attempt.submitted_at
    attempt.updated_at = datetime.now(timezone.utc)


@app.get("/admin/exams/{exam_id}/questions")
def admin_exam_questions(
    exam_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    if db.get(models.Exam, exam_id) is None:
        raise HTTPException(404, "آزمون پیدا نشد.")
    rows = db.query(models.ExamQuestion).filter_by(exam_id=exam_id).order_by(
        models.ExamQuestion.position.asc(), models.ExamQuestion.id.asc()
    ).all()
    return {"items": [
        {
            **_public_question(row),
            "correct_answer": row.correct_answer,
        }
        for row in rows
    ], "total": len(rows)}


@app.post("/admin/exams/{exam_id}/questions", status_code=201)
def create_exam_question(
    exam_id: int,
    payload: ExamQuestionInput,
    request: Request,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    require_content_same_origin(request)
    exam = db.get(models.Exam, exam_id)
    if exam is None:
        raise HTTPException(404, "آزمون پیدا نشد.")
    if db.query(models.ExamAttempt).filter_by(exam_id=exam_id).first():
        raise HTTPException(409, "پس از شروع اولین تلاش، ساختار سؤال‌های آزمون قابل تغییر نیست.")
    row = models.ExamQuestion(exam_id=exam_id, **payload.model_dump())
    db.add(row)
    try:
        db.commit()
        db.refresh(row)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, "شماره ترتیب این سؤال قبلاً استفاده شده است.") from exc
    return {**_public_question(row), "correct_answer": row.correct_answer}


@app.put("/admin/exams/{exam_id}/questions/{question_id}")
def update_exam_question(
    exam_id: int,
    question_id: int,
    payload: ExamQuestionInput,
    request: Request,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    require_content_same_origin(request)
    if db.query(models.ExamAttempt).filter_by(exam_id=exam_id).first():
        raise HTTPException(409, "پس از شروع اولین تلاش، ساختار سؤال‌های آزمون قابل تغییر نیست.")
    row = db.query(models.ExamQuestion).filter_by(id=question_id, exam_id=exam_id).first()
    if row is None:
        raise HTTPException(404, "سؤال پیدا نشد.")
    for key, value in payload.model_dump().items():
        setattr(row, key, value)
    try:
        db.commit()
        db.refresh(row)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, "شماره ترتیب این سؤال قبلاً استفاده شده است.") from exc
    return {**_public_question(row), "correct_answer": row.correct_answer}


@app.delete("/admin/exams/{exam_id}/questions/{question_id}")
def delete_exam_question(
    exam_id: int,
    question_id: int,
    request: Request,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    require_content_same_origin(request)
    if db.query(models.ExamAttempt).filter_by(exam_id=exam_id).first():
        raise HTTPException(409, "پس از شروع اولین تلاش، سؤال‌های آزمون قابل حذف نیستند.")
    row = db.query(models.ExamQuestion).filter_by(id=question_id, exam_id=exam_id).first()
    if row is None:
        raise HTTPException(404, "سؤال پیدا نشد.")
    db.delete(row)
    db.commit()
    return {"deleted": True}


@app.get("/student/exams/{exam_id}/attempt")
def get_student_exam_attempt(
    exam_id: int,
    student: dict = Depends(require_student),
    db: Session = Depends(get_db),
):
    exam = db.get(models.Exam, exam_id)
    if exam is None or exam.status == "draft":
        raise HTTPException(404, "آزمون پیدا نشد.")
    if exam.field != student["field"]:
        raise HTTPException(403, "این آزمون برای رشته حساب تو نیست.")
    registration = db.query(models.ExamRegistration).filter_by(
        exam_id=exam_id, student_auth_id=student["id"], status="registered"
    ).first()
    if registration is None:
        raise HTTPException(403, "برای شرکت در آزمون ابتدا باید ثبت‌نام کنی.")
    attempt = db.query(models.ExamAttempt).filter_by(
        exam_id=exam_id, student_auth_id=student["id"]
    ).first()
    if attempt is None:
        raise HTTPException(404, "هنوز تلاش آزمون شروع نشده است.")
    deadline = attempt.deadline_at
    if deadline.tzinfo is None:
        deadline = deadline.replace(tzinfo=timezone.utc)
    if attempt.status == "in_progress" and datetime.now(timezone.utc) >= deadline:
        _finalize_exam_attempt(db, attempt, exam)
        db.commit()
        db.refresh(attempt)
    questions = db.query(models.ExamQuestion).filter_by(exam_id=exam_id).order_by(
        models.ExamQuestion.position.asc(), models.ExamQuestion.id.asc()
    ).all()
    answers = {
        row.question_id: row
        for row in db.query(models.ExamAnswer).filter_by(attempt_id=attempt.id).all()
    }
    return {
        **_serialize_attempt(attempt, exam),
        "exam_title": exam.title,
        "questions": [_public_question(question, answers.get(question.id)) for question in questions],
    }


@app.post("/student/exams/{exam_id}/attempt/start", status_code=201)
def start_student_exam_attempt(
    exam_id: int,
    request: Request,
    response: Response,
    student: dict = Depends(require_student),
    db: Session = Depends(get_db),
):
    require_content_same_origin(request)
    exam = db.get(models.Exam, exam_id)
    if exam is None or exam.status == "draft":
        raise HTTPException(404, "آزمون پیدا نشد.")
    if exam.field != student["field"]:
        raise HTTPException(403, "این آزمون برای رشته حساب تو نیست.")
    registration = db.query(models.ExamRegistration).filter_by(
        exam_id=exam_id, student_auth_id=student["id"], status="registered"
    ).first()
    if registration is None:
        raise HTTPException(403, "برای شروع آزمون ابتدا باید ثبت‌نام کنی.")
    if exam.status not in {"published", "upcoming"} or exam.duration_minutes < 1:
        raise HTTPException(409, "این آزمون در حال حاضر قابل شروع نیست.")
    questions = db.query(models.ExamQuestion).filter_by(exam_id=exam_id).all()
    if not questions:
        raise HTTPException(409, "هنوز سؤالی برای این آزمون ثبت نشده است.")
    now = datetime.now(timezone.utc)
    starts_at = _parse_exam_start(exam)
    if now < starts_at:
        raise HTTPException(409, "زمان شروع آزمون هنوز نرسیده است.")
    if now > starts_at + timedelta(minutes=30):
        raise HTTPException(409, "مهلت شروع آزمون به پایان رسیده است.")

    existing = db.query(models.ExamAttempt).filter_by(
        exam_id=exam_id, student_auth_id=student["id"]
    ).first()
    if existing is not None:
        existing_deadline = existing.deadline_at
        if existing_deadline.tzinfo is None:
            existing_deadline = existing_deadline.replace(tzinfo=timezone.utc)
        if existing.status == "in_progress" and now < existing_deadline:
            response.status_code = 200
            return _serialize_attempt(existing, exam)
        if existing.status == "in_progress":
            _finalize_exam_attempt(db, existing, exam)
            db.commit()
            db.refresh(existing)
            raise HTTPException(409, "مهلت این تلاش به پایان رسیده است؛ امکان شروع دوباره وجود ندارد.")
        raise HTTPException(409, "برای این آزمون قبلاً تلاش ثبت شده است و امکان شروع مجدد وجود ندارد.")

    attempt = models.ExamAttempt(
        exam_id=exam_id,
        registration_id=registration.id,
        student_auth_id=student["id"],
        status="in_progress",
        started_at=now,
        deadline_at=now + timedelta(minutes=exam.duration_minutes),
        max_score=sum(question.points for question in questions),
        earned_score=0,
    )
    db.add(attempt)
    try:
        db.commit()
        db.refresh(attempt)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, "تلاش آزمون قبلاً شروع شده است.") from exc
    return _serialize_attempt(attempt, exam)


@app.put("/student/exams/{exam_id}/attempt/answers")
def save_student_exam_answers(
    exam_id: int,
    payload: ExamAnswersSave,
    request: Request,
    student: dict = Depends(require_student),
    db: Session = Depends(get_db),
):
    require_content_same_origin(request)
    exam = db.get(models.Exam, exam_id)
    if exam is None:
        raise HTTPException(404, "آزمون پیدا نشد.")
    attempt = db.query(models.ExamAttempt).filter_by(
        exam_id=exam_id, student_auth_id=student["id"]
    ).first()
    if attempt is None:
        raise HTTPException(404, "تلاش آزمون پیدا نشد.")
    now = datetime.now(timezone.utc)
    deadline = attempt.deadline_at
    if deadline.tzinfo is None:
        deadline = deadline.replace(tzinfo=timezone.utc)
    if attempt.status != "in_progress" or now >= deadline:
        if attempt.status == "in_progress":
            _finalize_exam_attempt(db, attempt, exam)
            db.commit()
        raise HTTPException(409, "مهلت پاسخ‌گویی به آزمون پایان یافته است.")
    question_ids = {row.id for row in db.query(models.ExamQuestion).filter_by(exam_id=exam_id).all()}
    if any(item.question_id not in question_ids for item in payload.answers):
        raise HTTPException(422, "یکی از سؤال‌ها متعلق به این آزمون نیست.")
    if len({item.question_id for item in payload.answers}) != len(payload.answers):
        raise HTTPException(422, "یک سؤال بیش از یک بار در فهرست پاسخ‌ها آمده است.")
    rows = {
        row.question_id: row
        for row in db.query(models.ExamAnswer).filter_by(attempt_id=attempt.id).all()
    }
    for item in payload.answers:
        row = rows.get(item.question_id)
        if row is None:
            row = models.ExamAnswer(
                attempt_id=attempt.id,
                question_id=item.question_id,
                answer_text=item.answer_text.strip(),
            )
            db.add(row)
        else:
            row.answer_text = item.answer_text.strip()
            row.updated_at = now
    db.commit()
    return {"saved": len(payload.answers), "saved_at": now}


@app.post("/student/exams/{exam_id}/attempt/submit")
def submit_student_exam_attempt(
    exam_id: int,
    request: Request,
    student: dict = Depends(require_student),
    db: Session = Depends(get_db),
):
    require_content_same_origin(request)
    exam = db.get(models.Exam, exam_id)
    if exam is None:
        raise HTTPException(404, "آزمون پیدا نشد.")
    attempt = db.query(models.ExamAttempt).filter_by(
        exam_id=exam_id, student_auth_id=student["id"]
    ).first()
    if attempt is None:
        raise HTTPException(404, "تلاش آزمون پیدا نشد.")
    if attempt.status != "in_progress":
        raise HTTPException(409, "این آزمون قبلاً تحویل داده شده است.")
    _finalize_exam_attempt(db, attempt, exam)
    db.commit()
    db.refresh(attempt)
    return {
        "status": attempt.status,
        "submitted_at": attempt.submitted_at,
        "results_published": exam.results_published,
    }


@app.get("/student/exams/{exam_id}/result")
def student_exam_result(
    exam_id: int,
    student: dict = Depends(require_student),
    db: Session = Depends(get_db),
):
    exam = db.get(models.Exam, exam_id)
    if exam is None or exam.status == "draft":
        raise HTTPException(404, "آزمون پیدا نشد.")
    attempt = db.query(models.ExamAttempt).filter_by(
        exam_id=exam_id, student_auth_id=student["id"]
    ).first()
    if attempt is None or attempt.status == "in_progress":
        raise HTTPException(409, "هنوز کارنامه‌ای برای این آزمون وجود ندارد.")
    if not exam.results_published or attempt.status != "graded":
        raise HTTPException(409, "کارنامه این آزمون هنوز منتشر نشده است.")
    rows = (
        db.query(models.ExamAnswer, models.ExamQuestion)
        .join(models.ExamQuestion, models.ExamAnswer.question_id == models.ExamQuestion.id)
        .filter(models.ExamAnswer.attempt_id == attempt.id)
        .order_by(models.ExamQuestion.position.asc())
        .all()
    )
    return {
        "exam_id": exam.id,
        "exam_title": exam.title,
        "attempt_id": attempt.id,
        "submitted_at": attempt.submitted_at,
        "earned_score": attempt.earned_score,
        "max_score": attempt.max_score,
        "percentage": round((attempt.earned_score / attempt.max_score) * 100, 2) if attempt.max_score else 0,
        "answers": [
            {
                "question_id": question.id,
                "position": question.position,
                "prompt": question.prompt,
                "answer_text": answer.answer_text,
                "is_correct": answer.is_correct,
                "earned_points": answer.earned_points,
                "max_points": question.points,
                "grader_note": answer.grader_note,
                "correct_answer": question.correct_answer if question.question_type == "single_choice" else None,
            }
            for answer, question in rows
        ],
    }


@app.get("/admin/exams/{exam_id}/attempts")
def admin_exam_attempts(
    exam_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    exam = db.get(models.Exam, exam_id)
    if exam is None:
        raise HTTPException(404, "آزمون پیدا نشد.")
    attempts = db.query(models.ExamAttempt).filter_by(exam_id=exam_id).order_by(
        models.ExamAttempt.submitted_at.desc(), models.ExamAttempt.id.desc()
    ).all()
    result = []
    for attempt in attempts:
        rows = (
            db.query(models.ExamAnswer, models.ExamQuestion)
            .join(models.ExamQuestion, models.ExamAnswer.question_id == models.ExamQuestion.id)
            .filter(models.ExamAnswer.attempt_id == attempt.id)
            .order_by(models.ExamQuestion.position.asc())
            .all()
        )
        attempt_summary = _serialize_attempt(attempt, exam)
        attempt_summary["earned_score"] = attempt.earned_score
        result.append({
            **attempt_summary,
            "student_auth_id": attempt.student_auth_id,
            "answers": [
                {
                    "id": answer.id,
                    "question_id": question.id,
                    "position": question.position,
                    "question_type": question.question_type,
                    "prompt": question.prompt,
                    "answer_text": answer.answer_text,
                    "earned_points": answer.earned_points,
                    "max_points": question.points,
                    "grader_note": answer.grader_note,
                }
                for answer, question in rows
            ],
        })
    return {"items": result, "total": len(result)}


@app.patch("/admin/exams/{exam_id}/attempts/{attempt_id}/answers/{answer_id}")
def grade_exam_answer(
    exam_id: int,
    attempt_id: int,
    answer_id: int,
    payload: ExamAnswerGradeInput,
    request: Request,
    admin: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    require_content_same_origin(request)
    attempt = db.query(models.ExamAttempt).filter_by(id=attempt_id, exam_id=exam_id).first()
    if attempt is None or attempt.status not in {"submitted", "graded"}:
        raise HTTPException(404, "پاسخ تحویل‌شده پیدا نشد.")
    row = (
        db.query(models.ExamAnswer, models.ExamQuestion)
        .join(models.ExamQuestion, models.ExamAnswer.question_id == models.ExamQuestion.id)
        .filter(models.ExamAnswer.id == answer_id, models.ExamAnswer.attempt_id == attempt_id)
        .first()
    )
    if row is None:
        raise HTTPException(404, "پاسخ پیدا نشد.")
    answer, question = row
    if question.question_type != "written":
        raise HTTPException(409, "پاسخ سؤال چهارگزینه‌ای به‌صورت خودکار تصحیح می‌شود.")
    if payload.earned_points > question.points:
        raise HTTPException(422, "نمره واردشده از بارم سؤال بیشتر است.")
    answer.earned_points = payload.earned_points
    answer.grader_note = payload.grader_note.strip() if payload.grader_note else None
    answer.graded_by_admin_id = admin["id"]
    answer.graded_at = datetime.now(timezone.utc)
    db.flush()
    remaining = (
        db.query(models.ExamAnswer)
        .filter_by(attempt_id=attempt_id, earned_points=None)
        .count()
    )
    if remaining == 0:
        attempt.status = "graded"
        attempt.graded_at = datetime.now(timezone.utc)
    attempt.earned_score = sum(
        item.earned_points or 0
        for item in db.query(models.ExamAnswer).filter_by(attempt_id=attempt_id).all()
    )
    attempt.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(attempt)
    return {"answer_id": answer.id, "earned_points": answer.earned_points, "attempt_status": attempt.status}


@app.patch("/admin/exams/{exam_id}/results")
def publish_exam_results(
    exam_id: int,
    payload: ExamResultsPublicationInput,
    request: Request,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    require_content_same_origin(request)
    exam = db.get(models.Exam, exam_id)
    if exam is None:
        raise HTTPException(404, "آزمون پیدا نشد.")
    if payload.results_published:
        pending = db.query(models.ExamAttempt).filter(
            models.ExamAttempt.exam_id == exam_id,
            models.ExamAttempt.status != "graded",
        ).count()
        if pending:
            raise HTTPException(409, "تا زمان تصحیح پاسخ‌های تشریحی، کارنامه قابل انتشار نیست.")
    exam.results_published = payload.results_published
    exam.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"exam_id": exam.id, "results_published": exam.results_published}


@app.get("/student/calendar")
def student_exam_calendar(
    student: dict = Depends(require_student),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(models.Exam, models.ExamRegistration)
        .join(models.ExamRegistration, models.Exam.id == models.ExamRegistration.exam_id)
        .filter(
            models.ExamRegistration.student_auth_id == student["id"],
            models.ExamRegistration.status == "registered",
            models.Exam.field == student["field"],
            models.Exam.status.in_(("published", "upcoming")),
            models.Exam.starts_at != "",
        )
        .order_by(models.Exam.starts_at.asc())
        .all()
    )
    items = []
    for exam, _registration in rows:
        try:
            starts_at = _parse_exam_start(exam)
        except HTTPException:
            continue
        items.append({
            "id": "exam-" + str(exam.id),
            "category": "exam",
            "title": exam.title,
            "starts_at": starts_at,
            "duration_minutes": exam.duration_minutes,
            "status": exam.status,
        })
    return {"items": items, "total": len(items)}
