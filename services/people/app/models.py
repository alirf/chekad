from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text

from app.db import Base


def utcnow():
    return datetime.now(timezone.utc)


class Mentor(Base):
    __tablename__ = "mentors"

    id = Column(Integer, primary_key=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    field = Column(String(20), nullable=False, index=True)  # physics|computer
    bio = Column(Text)
    achievements = Column(Text)
    capacity = Column(Integer, default=3, nullable=False)
    current_load = Column(Integer, default=0, nullable=False)
    status = Column(String(20), default="active", nullable=False)  # active|inactive|paused
    is_public = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)


class Tutor(Base):
    __tablename__ = "tutors"

    id = Column(Integer, primary_key=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    field = Column(String(20), nullable=False, index=True)
    specialties = Column(String(500))
    experience = Column(Text)
    bio = Column(Text)
    capacity = Column(Integer, default=5, nullable=False)
    current_load = Column(Integer, default=0, nullable=False)
    status = Column(String(20), default="active", nullable=False)
    is_public = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)