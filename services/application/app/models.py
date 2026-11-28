from datetime import datetime, timezone

from sqlalchemy import (
    Boolean, Column, Date, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.db import Base


def utcnow():
    return datetime.now(timezone.utc)


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True)
    # Stable identity from auth-service; no cross-database foreign key is possible.
    auth_student_id = Column(Integer, unique=True, nullable=True, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    # Student contact details are not requested in the public application flow.
    phone = Column(String(20), nullable=True, index=True)
    email = Column(String(255))
    grade = Column(String(20))
    field = Column(String(20), nullable=False)  # physics|computer
    parent_phone = Column(String(20))
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)


class MentorshipPackage(Base):
    __tablename__ = "mentorship_packages"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    duration_days = Column(Integer, nullable=False, default=30)
    sessions_per_week = Column(Integer, nullable=False, default=2)
    session_duration_minutes = Column(Integer, nullable=False, default=20)
    description = Column(Text)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)


class MentorshipApplication(Base):
    __tablename__ = "mentorship_applications"

    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="RESTRICT"), nullable=False, index=True)
    package_id = Column(Integer, ForeignKey("mentorship_packages.id", ondelete="SET NULL"))
    field = Column(String(20), nullable=False)
    status = Column(String(30), default="new", nullable=False, index=True)
    preferred_schedule = Column(String(255))
    student_note = Column(Text)
    admin_note = Column(Text)
    reject_reason = Column(Text)
    idempotency_key = Column(String(64), unique=True, nullable=True, index=True)
    request_fingerprint = Column(String(64), nullable=True)
    # Nullable for records created before explicit guardian consent was added.
    guardian_consent_at = Column(DateTime(timezone=True), nullable=True)
    privacy_accepted_at = Column(DateTime(timezone=True), nullable=True)
    privacy_notice_version = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    student = relationship("Student")
    package = relationship("MentorshipPackage")


class MentorAssignment(Base):
    __tablename__ = "mentor_assignments"

    id = Column(Integer, primary_key=True)
    application_id = Column(Integer, ForeignKey("mentorship_applications.id", ondelete="CASCADE"), nullable=False, index=True)
    mentor_id = Column(Integer, nullable=False, index=True)  # cross-service → people-service
    start_date = Column(Date, nullable=False)
    end_date = Column(Date)
    status = Column(String(20), default="active", nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    application = relationship("MentorshipApplication")


class MentorSession(Base):
    __tablename__ = "mentor_sessions"

    id = Column(Integer, primary_key=True)
    assignment_id = Column(Integer, ForeignKey("mentor_assignments.id", ondelete="CASCADE"), nullable=False, index=True)
    session_number = Column(Integer, nullable=False)
    scheduled_at = Column(DateTime(timezone=True))
    duration_minutes = Column(Integer, default=20, nullable=False)
    status = Column(String(20), default="scheduled", nullable=False)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)


class MentorWeeklyReport(Base):
    __tablename__ = "mentor_weekly_reports"

    id = Column(Integer, primary_key=True)
    assignment_id = Column(Integer, ForeignKey("mentor_assignments.id", ondelete="CASCADE"), nullable=False, index=True)
    week_number = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)


class TutoringApplication(Base):
    __tablename__ = "tutoring_applications"

    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="RESTRICT"), nullable=False, index=True)
    field = Column(String(20), nullable=False)
    topic = Column(String(255), nullable=False)
    description = Column(Text)
    status = Column(String(30), default="new", nullable=False, index=True)
    admin_note = Column(Text)
    reject_reason = Column(Text)
    idempotency_key = Column(String(64), unique=True, nullable=True, index=True)
    request_fingerprint = Column(String(64), nullable=True)
    guardian_consent_at = Column(DateTime(timezone=True), nullable=True)
    privacy_accepted_at = Column(DateTime(timezone=True), nullable=True)
    privacy_notice_version = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    student = relationship("Student")


class TutorAssignment(Base):
    __tablename__ = "tutor_assignments"

    id = Column(Integer, primary_key=True)
    application_id = Column(Integer, ForeignKey("tutoring_applications.id", ondelete="CASCADE"), nullable=False, index=True)
    tutor_id = Column(Integer, nullable=False, index=True)  # cross-service
    start_date = Column(Date, nullable=False)
    end_date = Column(Date)
    status = Column(String(20), default="active", nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    application = relationship("TutoringApplication")


class TutorSession(Base):
    __tablename__ = "tutor_sessions"

    id = Column(Integer, primary_key=True)
    assignment_id = Column(Integer, ForeignKey("tutor_assignments.id", ondelete="CASCADE"), nullable=False, index=True)
    session_number = Column(Integer, nullable=False)
    scheduled_at = Column(DateTime(timezone=True))
    duration_minutes = Column(Integer)
    status = Column(String(20), default="scheduled", nullable=False)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)


class InternalNote(Base):
    __tablename__ = "internal_notes"

    id = Column(Integer, primary_key=True)
    application_type = Column(String(20), nullable=False)  # mentorship|tutoring
    application_id = Column(Integer, nullable=False)
    admin_id = Column(Integer, nullable=False)  # cross-service → auth-service
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)


class StudentMessageThread(Base):
    __tablename__ = "student_message_threads"
    __table_args__ = (
        UniqueConstraint("student_auth_id", "channel", name="uq_student_message_thread_student_channel"),
    )

    id = Column(Integer, primary_key=True)
    student_auth_id = Column(Integer, nullable=False, index=True)
    student_name = Column(String(180), nullable=False)
    channel = Column(String(20), nullable=False, default="support")
    subject = Column(String(140), nullable=False, default="گفت‌وگو با پشتیبانی چکاد")
    status = Column(String(20), nullable=False, default="open", index=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)
    last_message_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)


class StudentMessage(Base):
    __tablename__ = "student_messages"

    id = Column(Integer, primary_key=True)
    thread_id = Column(Integer, ForeignKey("student_message_threads.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_type = Column(String(16), nullable=False)  # student|admin
    sender_id = Column(Integer, nullable=False)
    body = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    read_at = Column(DateTime(timezone=True))


class StudentStudyReport(Base):
    __tablename__ = "student_study_reports"

    id = Column(Integer, primary_key=True)
    student_auth_id = Column(Integer, nullable=False, index=True)
    report_date = Column(Date, nullable=False, index=True)
    study_minutes = Column(Integer, nullable=False)
    topics = Column(Text, nullable=False)
    summary = Column(Text, nullable=False)
    blockers = Column(Text)
    next_step = Column(Text)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)


class StudentStudyTask(Base):
    __tablename__ = "student_study_tasks"

    id = Column(Integer, primary_key=True)
    student_auth_id = Column(Integer, nullable=False, index=True)
    title = Column(String(180), nullable=False)
    description = Column(Text)
    planned_at = Column(DateTime(timezone=True), nullable=False, index=True)
    duration_minutes = Column(Integer, nullable=False, default=60)
    status = Column(String(20), nullable=False, default="pending", index=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)
