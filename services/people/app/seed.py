"""Create optional development-only demo mentors and tutors.

Run explicitly: docker compose exec -e SEED_DEMO_DATA=true people-service python -m app.seed
"""
import os

from app.db import SessionLocal
from app.models import Mentor, Tutor


def enabled() -> bool:
    return os.getenv("SEED_DEMO_DATA", "false").strip().lower() in {"1", "true", "yes"}


def seed() -> None:
    if not enabled():
        print("Seed skipped: set SEED_DEMO_DATA=true explicitly for development data.")
        return

    db = SessionLocal()
    try:
        demo_mentors = [
            dict(first_name="علی", last_name="رضایی", field="physics", bio="DEMO — اطلاعات نمونه؛ مدال‌آور طلای المپیاد فیزیک", achievements="DEMO — مدال طلا ۱۴۰۱", capacity=3, current_load=0, status="active", is_public=False),
            dict(first_name="مریم", last_name="حسینی", field="computer", bio="DEMO — اطلاعات نمونه؛ مدال‌آور نقره المپیاد کامپیوتر", achievements="DEMO — مدال نقره ۱۴۰۰", capacity=3, current_load=0, status="active", is_public=False),
        ]
        demo_tutors = [
            dict(first_name="سارا", last_name="احمدی", field="physics", specialties="DEMO — مکانیک، الکتریسیته", experience="DEMO — سابقه نمونه", bio="اطلاعات آموزشی آزمایشی", capacity=5, current_load=0, status="active", is_public=False),
            dict(first_name="محمد", last_name="کریمی", field="computer", specialties="DEMO — الگوریتم، ساختمان داده", experience="DEMO — سابقه نمونه", bio="اطلاعات آموزشی آزمایشی", capacity=5, current_load=0, status="active", is_public=False),
        ]
        for item in demo_mentors:
            exists = db.query(Mentor).filter_by(
                first_name=item["first_name"], last_name=item["last_name"], field=item["field"]
            ).first()
            if not exists:
                db.add(Mentor(**item))
        for item in demo_tutors:
            exists = db.query(Tutor).filter_by(
                first_name=item["first_name"], last_name=item["last_name"], field=item["field"]
            ).first()
            if not exists:
                db.add(Tutor(**item))
        db.commit()
        print("Development demo mentors/tutors ensured. Demo records remain unpublished.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
