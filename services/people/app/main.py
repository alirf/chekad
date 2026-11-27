from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import settings
from app.db import engine, get_db
from app import models

app = FastAPI(title=f"Chekad {settings.service_name}", version="0.2.0")


@app.get("/health")
def health():
    db_status = "ok"
    try:
        with engine.connect() as c:
            c.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"error:{e.__class__.__name__}"
    return {"status": "ok", "service": settings.service_name, "db": db_status}


def _mentor(m):
    return {
        "id": m.id, "first_name": m.first_name, "last_name": m.last_name,
        "field": m.field, "bio": m.bio, "achievements": m.achievements,
        "capacity": m.capacity, "current_load": m.current_load, "status": m.status,
    }


def _tutor(t):
    return {
        "id": t.id, "first_name": t.first_name, "last_name": t.last_name,
        "field": t.field, "specialties": t.specialties, "bio": t.bio,
        "capacity": t.capacity, "current_load": t.current_load, "status": t.status,
    }


@app.get("/mentors")
def list_mentors(field: str | None = None, db: Session = Depends(get_db)):
    q = db.query(models.Mentor).filter(models.Mentor.is_public == True)
    if field:
        q = q.filter(models.Mentor.field == field)
    return [_mentor(m) for m in q.order_by(models.Mentor.id).all()]


@app.get("/mentors/{mentor_id}")
def get_mentor(mentor_id: int, db: Session = Depends(get_db)):
    m = db.query(models.Mentor).filter(
        models.Mentor.id == mentor_id, models.Mentor.is_public == True
    ).first()
    if not m:
        raise HTTPException(404, "mentor not found")
    return _mentor(m)


@app.get("/tutors")
def list_tutors(field: str | None = None, db: Session = Depends(get_db)):
    q = db.query(models.Tutor).filter(models.Tutor.is_public == True)
    if field:
        q = q.filter(models.Tutor.field == field)
    return [_tutor(t) for t in q.order_by(models.Tutor.id).all()]


@app.get("/tutors/{tutor_id}")
def get_tutor(tutor_id: int, db: Session = Depends(get_db)):
    t = db.query(models.Tutor).filter(
        models.Tutor.id == tutor_id, models.Tutor.is_public == True
    ).first()
    if not t:
        raise HTTPException(404, "tutor not found")
    return _tutor(t)