"""Interactively create the first admin or rotate an existing admin password.

Run manually inside the auth container:
    docker compose exec -it auth-service python -m app.bootstrap_admin
"""
import getpass
import re
import sys

import bcrypt

from app.db import SessionLocal
from app.models import AdminUser


def main() -> None:
    email = input("Admin email: ").strip().lower()
    name = input("Admin display name [مدیر چکاد]: ").strip() or "مدیر چکاد"
    password = getpass.getpass("Admin password (12-72 UTF-8 bytes): ")
    confirmation = getpass.getpass("Confirm password: ")

    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        raise SystemExit("A valid admin email address is required.")
    password_bytes = password.encode("utf-8")
    if len(password_bytes) < 12 or len(password_bytes) > 72:
        raise SystemExit("Password must be between 12 and 72 UTF-8 bytes.")
    if password != confirmation:
        raise SystemExit("Password confirmation does not match.")

    db = SessionLocal()
    try:
        admin = db.query(AdminUser).filter(AdminUser.email == email).first()
        if admin is None:
            admin = AdminUser(email=email, name=name, is_active=True)
            db.add(admin)

        admin.name = name
        admin.password_hash = bcrypt.hashpw(password_bytes, bcrypt.gensalt(rounds=12)).decode("utf-8")
        admin.is_active = True
        db.commit()
        print(f"Admin credentials created/updated for: {email}")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"Could not bootstrap admin: {exc.__class__.__name__}: {exc}", file=sys.stderr)
        raise
