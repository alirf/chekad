from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, JSON, String, Text, UniqueConstraint

from app.db import Base


def utcnow():
    return datetime.now(timezone.utc)


class SiteContent(Base):
    __tablename__ = "site_content"

    id = Column(Integer, primary_key=True)
    key = Column(String(100), unique=True, nullable=False, index=True)
    value = Column(Text, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)


class SitePage(Base):
    __tablename__ = "site_pages"
    id = Column(Integer, primary_key=True)
    slug = Column(String(120), unique=True, nullable=False, index=True)
    title = Column(String(240), nullable=False)
    description = Column(Text, default="", nullable=False)
    content = Column(Text, default="", nullable=False)
    sections = Column(JSON, default=list, nullable=False)
    layout = Column(String(24), default="standard", nullable=False)
    image_url = Column(String(1000))
    seo_title = Column(String(240))
    seo_description = Column(String(320))
    status = Column(String(20), default="draft", nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)


class Article(Base):
    __tablename__ = "articles"
    id = Column(Integer, primary_key=True)
    slug = Column(String(160), unique=True, nullable=False, index=True)
    title = Column(String(240), nullable=False)
    excerpt = Column(Text, default="", nullable=False)
    body = Column(Text, default="", nullable=False)
    category = Column(String(80), default="عمومی", nullable=False, index=True)
    tags = Column(String(500), default="", nullable=False)
    cover_image_url = Column(String(1000))
    status = Column(String(20), default="draft", nullable=False, index=True)
    published_at = Column(DateTime(timezone=True))
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)


class Exam(Base):
    __tablename__ = "exams"
    id = Column(Integer, primary_key=True)
    slug = Column(String(160), unique=True, nullable=False, index=True)
    title = Column(String(240), nullable=False)
    description = Column(Text, default="", nullable=False)
    field = Column(String(20), nullable=False, index=True)
    stage = Column(String(80), default="", nullable=False)
    starts_at = Column(String(80), default="", nullable=False)
    duration_minutes = Column(Integer, default=0, nullable=False)
    registration_url = Column(String(1000))
    status = Column(String(20), default="draft", nullable=False, index=True)
    cover_image_url = Column(String(1000))
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)



class ExamRegistration(Base):
    __tablename__ = "exam_registrations"
    __table_args__ = (
        UniqueConstraint("exam_id", "student_auth_id", name="uq_exam_registration_student"),
    )

    id = Column(Integer, primary_key=True)
    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False, index=True)
    student_auth_id = Column(Integer, nullable=False, index=True)
    status = Column(String(20), nullable=False, default="registered", index=True)
    registered_at = Column(DateTime(timezone=True), nullable=False)
    cancelled_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)
