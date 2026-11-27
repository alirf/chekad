"""Create optional development-only site content defaults.

Run explicitly: docker compose exec -e SEED_DEMO_DATA=true content-service python -m app.seed
"""
import os

from app.db import SessionLocal
from app.models import SiteContent

SEED = [
    ("home.hero.title", "چکاد — خدمات المپیاد علمی"),
    ("home.hero.subtitle", "منتورینگ و تدریس خصوصی المپیاد فیزیک و کامپیوتر"),
    ("about.title", "درباره چکاد"),
    ("about.body", "چکاد پلتفرم خدمات المپیادهای علمی دانش‌آموزی ایران است."),
    ("contact.email", "info@chekad.ir"),
    ("contact.phone", "اطلاعات تماس را پیش از انتشار تنظیم کنید"),
]


def seed() -> None:
    if os.getenv("SEED_DEMO_DATA", "false").strip().lower() not in {"1", "true", "yes"}:
        print("Seed skipped: set SEED_DEMO_DATA=true explicitly for development data.")
        return

    db = SessionLocal()
    try:
        existing_keys = {row[0] for row in db.query(SiteContent.key).all()}
        missing = [SiteContent(key=key, value=value) for key, value in SEED if key not in existing_keys]
        if not missing:
            print("Development content defaults already exist; no changes made.")
            return
        db.add_all(missing)
        db.commit()
        print(f"Inserted {len(missing)} missing development content rows.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
