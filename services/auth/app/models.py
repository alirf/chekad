from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Integer, String

from app.db import Base


def utcnow():
    return datetime.now(timezone.utc)


class AdminUser(Base):
    __tablename__ = "admin_users"

    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)


class StudentUser(Base):
    __tablename__ = "student_users"

    id = Column(Integer, primary_key=True)
    phone = Column(String(16), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(80), nullable=False)
    last_name = Column(String(80), nullable=False)
    grade = Column(String(24), nullable=False)
    field = Column(String(24), nullable=False)
    guardian_phone = Column(String(16), nullable=False)
    guardian_consent = Column(Boolean, nullable=False, default=False)
    guardian_consent_at = Column(DateTime(timezone=True), nullable=False)
    privacy_accepted_at = Column(DateTime(timezone=True), nullable=False)
    phone_verified = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)
