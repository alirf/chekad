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
    results_published = Column(Boolean, default=False, nullable=False)
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



class ExamQuestion(Base):
    __tablename__ = "exam_questions"
    __table_args__ = (
        UniqueConstraint("exam_id", "position", name="uq_exam_questions_exam_position"),
    )

    id = Column(Integer, primary_key=True)
    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False, index=True)
    position = Column(Integer, nullable=False, default=1)
    question_type = Column(String(24), nullable=False, default="single_choice")
    prompt = Column(Text, nullable=False)
    options = Column(JSON, nullable=True)
    correct_answer = Column(Text, nullable=True)
    points = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)


class ExamAttempt(Base):
    __tablename__ = "exam_attempts"
    __table_args__ = (
        UniqueConstraint("exam_id", "student_auth_id", name="uq_exam_attempt_student"),
    )

    id = Column(Integer, primary_key=True)
    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False, index=True)
    registration_id = Column(Integer, ForeignKey("exam_registrations.id", ondelete="RESTRICT"), nullable=False, index=True)
    student_auth_id = Column(Integer, nullable=False, index=True)
    status = Column(String(20), nullable=False, default="in_progress", index=True)
    started_at = Column(DateTime(timezone=True), nullable=False)
    deadline_at = Column(DateTime(timezone=True), nullable=False)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    max_score = Column(Integer, nullable=False, default=0)
    earned_score = Column(Integer, nullable=False, default=0)
    graded_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)


class ExamAnswer(Base):
    __tablename__ = "exam_answers"
    __table_args__ = (
        UniqueConstraint("attempt_id", "question_id", name="uq_exam_answer_attempt_question"),
    )

    id = Column(Integer, primary_key=True)
    attempt_id = Column(Integer, ForeignKey("exam_attempts.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(Integer, ForeignKey("exam_questions.id", ondelete="CASCADE"), nullable=False, index=True)
    answer_text = Column(Text, nullable=False, default="")
    is_correct = Column(Boolean, nullable=True)
    earned_points = Column(Integer, nullable=True)
    grader_note = Column(Text, nullable=True)
    graded_by_admin_id = Column(Integer, nullable=True)
    graded_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)
