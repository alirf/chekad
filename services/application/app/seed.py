from app.db import SessionLocal
from app.models import MentorshipPackage


def seed():
    db = SessionLocal()
    try:
        if db.query(MentorshipPackage).count() > 0:
            print("Packages already exist. Skipping.")
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
        print("Seeded mentorship package.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()