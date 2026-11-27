import os

import bcrypt

from app.db import SessionLocal
from app.models import AdminUser


def seed():
    db = SessionLocal()
    try:
        if db.query(AdminUser).count() > 0:
            print("Admin already exists. Skipping seed.")
            return
        email = os.getenv("ADMIN_EMAIL", "admin@chekad.ir")
        password = os.getenv("ADMIN_PASSWORD", "changeme123")
        name = os.getenv("ADMIN_NAME", "مدیر چکاد")
        db.add(AdminUser(
            email=email.lower().strip(),
            password_hash=bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode(),
            name=name,
        ))
        db.commit()
        print(f"Seeded admin: {email}")
    finally:
        db.close()


if __name__ == "__main__":
    seed()