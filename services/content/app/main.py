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


@app.get("/content")
def all_content(db: Session = Depends(get_db)):
    return {row.key: row.value for row in db.query(models.SiteContent).all()}


@app.get("/pages/{page}")
def page_content(page: str, db: Session = Depends(get_db)):
    rows = db.query(models.SiteContent).filter(
        models.SiteContent.key.like(f"{page}.%")
    ).all()
    return {row.key: row.value for row in rows}