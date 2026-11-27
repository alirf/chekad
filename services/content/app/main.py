from datetime import datetime, timezone
from typing import Literal
from urllib.parse import urlsplit

import httpx
from fastapi import Depends, FastAPI, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import settings
from app.db import engine, get_db
from app import models

app = FastAPI(title=f"Chekad {settings.service_name}", version="0.3.0")


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
    image_url: str | None = None
    status: Literal["draft", "published"] = "draft"


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


def image_url_is_safe(value: str | None) -> None:
    if value is None or value == "":
        return
    parsed = urlsplit(value)
    if parsed.scheme not in ("https",) or not parsed.netloc or parsed.username or parsed.password:
        raise HTTPException(422, "نشانی تصویر باید یک URL معتبر HTTPS باشد.")


def page_dict(row):
    return {k: getattr(row, k) for k in ("id", "slug", "title", "description", "content", "image_url", "status", "updated_at")}


def article_dict(row):
    return {k: getattr(row, k) for k in ("id", "slug", "title", "excerpt", "body", "category", "tags", "cover_image_url", "status", "published_at", "updated_at")}


def exam_dict(row):
    return {k: getattr(row, k) for k in ("id", "slug", "title", "description", "field", "stage", "starts_at", "duration_minutes", "registration_url", "status", "cover_image_url", "updated_at")}


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
