import httpx
from urllib.parse import urlsplit
from fastapi import Depends, FastAPI, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import text
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
    if request.headers.get("cookie"): headers["Cookie"] = request.headers["cookie"]
    if request.headers.get("authorization"): headers["Authorization"] = request.headers["authorization"]
    if not headers: raise HTTPException(401, "احراز هویت مدیر لازم است.")
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            response = await client.get(settings.auth_internal_url.rstrip("/") + "/me", headers=headers)
    except httpx.RequestError as exc:
        raise HTTPException(503, "سرویس احراز هویت در دسترس نیست.") from exc
    if response.status_code != 200: raise HTTPException(401, "نشست مدیر معتبر نیست.")
    admin = response.json()
    if not isinstance(admin, dict) or not isinstance(admin.get("id"), int):
        raise HTTPException(503, "پاسخ سرویس احراز هویت معتبر نیست.")
    return admin


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
            status_code=503,
            detail={"status": "not_ready", "service": settings.service_name, "dependency": "database"},
        ) from exc
    return {"status": "ok", "service": settings.service_name, "db": "ok"}


def person_dict(p):
    return {k: getattr(p, k, None) for k in ("id", "first_name", "last_name", "field", "bio", "achievements", "specialties", "experience", "image_url", "medals", "education", "capacity", "current_load", "status", "is_public")}


class PersonInput(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    field: str = Field(pattern="^(physics|computer)$")
    bio: str | None = None
    achievements: str | None = None
    specialties: str | None = None
    experience: str | None = None
    image_url: str | None = None
    medals: str | None = None
    education: str | None = None
    capacity: int = Field(default=3, ge=0, le=100)
    status: str = Field(default="active", pattern="^(active|inactive|paused)$")
    is_public: bool = True


def safe_image(value):
    from urllib.parse import urlsplit
    if value:
        parsed = urlsplit(value)
        internal_media = value.startswith("/api/content/media/") and ".." not in value
        if not internal_media and (parsed.scheme != "https" or not parsed.netloc or parsed.username or parsed.password):
            raise HTTPException(422, "نشانی تصویر باید HTTPS معتبر یا رسانه بارگذاری‌شده چکاد باشد.")


def list_people(db, model, field):
    q = db.query(model).filter(model.is_public == True, model.status == "active")
    if field in ("physics", "computer"): q = q.filter(model.field == field)
    return [person_dict(p) for p in q.order_by(model.id).all()]


@app.get("/mentors")
def list_mentors(field: str | None = None, db: Session = Depends(get_db)):
    return list_people(db, models.Mentor, field)


@app.get("/mentors/{person_id}")
def get_mentor(person_id: int, db: Session = Depends(get_db)):
    p = db.query(models.Mentor).filter_by(id=person_id, is_public=True).first()
    if not p: raise HTTPException(404, "mentor not found")
    return person_dict(p)


@app.get("/tutors")
def list_tutors(field: str | None = None, db: Session = Depends(get_db)):
    return list_people(db, models.Tutor, field)


@app.get("/tutors/{person_id}")
def get_tutor(person_id: int, db: Session = Depends(get_db)):
    p = db.query(models.Tutor).filter_by(id=person_id, is_public=True).first()
    if not p: raise HTTPException(404, "tutor not found")
    return person_dict(p)


@app.get("/admin/mentors")
def admin_mentors(db: Session = Depends(get_db), _: dict = Depends(require_admin)):
    return [person_dict(p) for p in db.query(models.Mentor).order_by(models.Mentor.id.desc()).all()]


@app.post("/admin/mentors", status_code=201)
def create_mentor(payload: PersonInput, db: Session = Depends(get_db), _: dict = Depends(require_admin)):
    safe_image(payload.image_url)
    row = models.Mentor(**payload.model_dump())
    db.add(row); db.commit(); db.refresh(row)
    return person_dict(row)


@app.put("/admin/mentors/{person_id}")
def update_mentor(person_id: int, payload: PersonInput, db: Session = Depends(get_db), _: dict = Depends(require_admin)):
    safe_image(payload.image_url)
    row = db.get(models.Mentor, person_id)
    if not row: raise HTTPException(404, "mentor not found")
    for key, value in payload.model_dump().items(): setattr(row, key, value)
    db.commit(); db.refresh(row)
    return person_dict(row)


@app.delete("/admin/mentors/{person_id}")
def delete_mentor(person_id: int, db: Session = Depends(get_db), _: dict = Depends(require_admin)):
    row = db.get(models.Mentor, person_id)
    if not row: raise HTTPException(404, "mentor not found")
    db.delete(row); db.commit()
    return {"deleted": True}


@app.get("/admin/tutors")
def admin_tutors(db: Session = Depends(get_db), _: dict = Depends(require_admin)):
    return [person_dict(p) for p in db.query(models.Tutor).order_by(models.Tutor.id.desc()).all()]


@app.post("/admin/tutors", status_code=201)
def create_tutor(payload: PersonInput, db: Session = Depends(get_db), _: dict = Depends(require_admin)):
    safe_image(payload.image_url)
    row = models.Tutor(**payload.model_dump(exclude={"achievements"}))
    db.add(row); db.commit(); db.refresh(row)
    return person_dict(row)


@app.put("/admin/tutors/{person_id}")
def update_tutor(person_id: int, payload: PersonInput, db: Session = Depends(get_db), _: dict = Depends(require_admin)):
    safe_image(payload.image_url)
    row = db.get(models.Tutor, person_id)
    if not row: raise HTTPException(404, "tutor not found")
    for key, value in payload.model_dump(exclude={"achievements"}).items(): setattr(row, key, value)
    db.commit(); db.refresh(row)
    return person_dict(row)


@app.delete("/admin/tutors/{person_id}")
def delete_tutor(person_id: int, db: Session = Depends(get_db), _: dict = Depends(require_admin)):
    row = db.get(models.Tutor, person_id)
    if not row: raise HTTPException(404, "tutor not found")
    db.delete(row); db.commit()
    return {"deleted": True}
