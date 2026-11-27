from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text

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
    image_url = Column(String(1000))
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
