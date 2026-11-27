from fastapi import Depends, FastAPI
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


@app.get("/admin/stats")
def stats(db: Session = Depends(get_db)):
    return {
        "students": db.query(models.Student).count(),
        "mentorship_applications": db.query(models.MentorshipApplication).count(),
        "tutoring_applications": db.query(models.TutoringApplication).count(),
        "mentorship_packages": db.query(models.MentorshipPackage).count(),
        "mentor_assignments": db.query(models.MentorAssignment).count(),
        "tutor_assignments": db.query(models.TutorAssignment).count(),
    }