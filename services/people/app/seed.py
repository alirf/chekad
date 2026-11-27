from app.db import SessionLocal
from app.models import Mentor, Tutor


def seed():
    db = SessionLocal()
    try:
        if db.query(Mentor).count() == 0:
            db.add_all([
                Mentor(first_name="علی", last_name="رضایی", field="physics",
                       bio="مدال‌آور طلای المپیاد فیزیک", achievements="مدال طلا ۱۴۰۱",
                       capacity=3, current_load=0, status="active", is_public=True),
                Mentor(first_name="مریم", last_name="حسینی", field="computer",
                       bio="مدال‌آور نقره المپیاد کامپیوتر", achievements="مدال نقره ۱۴۰۰",
                       capacity=3, current_load=0, status="active", is_public=True),
            ])
            print("Seeded mentors.")
        if db.query(Tutor).count() == 0:
            db.add_all([
                Tutor(first_name="سارا", last_name="احمدی", field="physics",
                      specialties="مکانیک، الکتریسیته", bio="مدرس با ۵ سال سابقه",
                      capacity=5, current_load=0, status="active", is_public=True),
                Tutor(first_name="محمد", last_name="کریمی", field="computer",
                      specialties="الگوریتم، ساختمان داده", bio="مدرس با ۴ سال سابقه",
                      capacity=5, current_load=0, status="active", is_public=True),
            ])
            print("Seeded tutors.")
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed()