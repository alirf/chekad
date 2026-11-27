"""Create optional development-only mentorship package data.

Run explicitly: docker compose exec -e SEED_DEMO_DATA=true application-service python -m app.seed
"""
import os

from app.db import SessionLocal
from app.models import MentorshipPackage


def seed() -> None:
    if os.getenv("SEED_DEMO_DATA", "false").strip().lower() not in {"1", "true", "yes"}:
        print("Seed skipped: set SEED_DEMO_DATA=true explicitly for development data.")
        return

    db = SessionLocal()
    try:
        exists = db.query(MentorshipPackage).filter(
            MentorshipPackage.name == "پکیج یک‌ماهه منتورینگ"
        ).first()
        if exists:
            print("Development mentorship package already exists; no changes made.")
            return
        db.add(MentorshipPackage(
            name="پکیج یک‌ماهه منتورینگ",
            duration_days=30,
            sessions_per_week=2,
            session_duration_minutes=20,
            description="۸ جلسه ۲۰ دقیقه‌ای در یک ماه + برنامه‌ریزی و گزارش هفتگی",
            is_active=True,
        ))
        db.commit()
        print("Development mentorship package inserted.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
