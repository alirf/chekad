from app.db import SessionLocal
from app.models import SiteContent


SEED = [
    ("home.hero.title", "چکاد — خدمات المپیاد علمی"),
    ("home.hero.subtitle", "منتورینگ و تدریس خصوصی المپیاد فیزیک و کامپیوتر"),
    ("about.title", "درباره چکاد"),
    ("about.body", "چکاد پلتفرم خدمات المپیادهای علمی دانش‌آموزی ایران است."),
    ("contact.email", "info@chekad.ir"),
    ("contact.phone", "۰۲۱-XXXXXXXX"),
]


def seed():
    db = SessionLocal()
    try:
        if db.query(SiteContent).count() > 0:
            print("Content already exists. Skipping.")
            return
        db.add_all([SiteContent(key=k, value=v) for k, v in SEED])
        db.commit()
        print(f"Seeded {len(SEED)} content rows.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()