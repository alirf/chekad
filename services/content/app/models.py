from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Integer, String, Text

from app.db import Base


def utcnow():
    return datetime.now(timezone.utc)


class SiteContent(Base):
    __tablename__ = "site_content"

    id = Column(Integer, primary_key=True)
    key = Column(String(100), unique=True, nullable=False, index=True)
    value = Column(Text, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)