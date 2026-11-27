from fastapi import FastAPI
from sqlalchemy import text

from app.config import settings
from app.db import engine

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