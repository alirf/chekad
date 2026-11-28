from datetime import datetime, timezone

from sqlalchemy import (
    BigInteger, Boolean, CheckConstraint, Column, Date, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, text,
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
    __table_args__ = (
        Index(
            "uq_mentor_assignments_active_application",
            "application_id",
            unique=True,
            sqlite_where=text("status = 'active'"),
            postgresql_where=text("status = 'active'"),
        ),
    )

    id = Column(Integer, primary_key=True)
    application_id = Column(Integer, ForeignKey("mentorship_applications.id", ondelete="CASCADE"), nullable=False, index=True)
    mentor_id = Column(Integer, nullable=False, index=True)  # cross-service → people-service
    person_name = Column(String(180), nullable=True)
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
    __table_args__ = (
        UniqueConstraint("assignment_id", "week_number", name="uq_mentor_weekly_reports_assignment_week"),
    )

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
    __table_args__ = (
        Index(
            "uq_tutor_assignments_active_application",
            "application_id",
            unique=True,
            sqlite_where=text("status = 'active'"),
            postgresql_where=text("status = 'active'"),
        ),
    )

    id = Column(Integer, primary_key=True)
    application_id = Column(Integer, ForeignKey("tutoring_applications.id", ondelete="CASCADE"), nullable=False, index=True)
    tutor_id = Column(Integer, nullable=False, index=True)  # cross-service
    person_name = Column(String(180), nullable=True)
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
        Index(
            "uq_student_message_threads_support_student",
            "student_auth_id",
            unique=True,
            sqlite_where=text("channel = 'support'"),
            postgresql_where=text("channel = 'support'"),
        ),
        Index(
            "uq_student_message_threads_advisor_assignment",
            "advisor_assignment_id",
            unique=True,
            sqlite_where=text("advisor_assignment_id IS NOT NULL"),
            postgresql_where=text("advisor_assignment_id IS NOT NULL"),
        ),
        Index(
            "uq_student_message_threads_teacher_assignment",
            "tutor_assignment_id",
            unique=True,
            sqlite_where=text("tutor_assignment_id IS NOT NULL"),
            postgresql_where=text("tutor_assignment_id IS NOT NULL"),
        ),
    )

    id = Column(Integer, primary_key=True)
    student_auth_id = Column(Integer, nullable=False, index=True)
    student_name = Column(String(180), nullable=False)
    channel = Column(String(20), nullable=False, default="support")
    advisor_assignment_id = Column(Integer, ForeignKey("mentor_assignments.id", ondelete="CASCADE"), nullable=True, index=True)
    tutor_assignment_id = Column(Integer, ForeignKey("tutor_assignments.id", ondelete="CASCADE"), nullable=True, index=True)
    subject = Column(String(140), nullable=False, default="گفت‌وگو با پشتیبانی چکاد")
    status = Column(String(20), nullable=False, default="open", index=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)
    last_message_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)


class StudentMessage(Base):
    __tablename__ = "student_messages"

    id = Column(Integer, primary_key=True)
    thread_id = Column(Integer, ForeignKey("student_message_threads.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_type = Column(String(16), nullable=False)  # student|admin|mentor
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



class StudentInvoice(Base):
    __tablename__ = "student_invoices"

    id = Column(Integer, primary_key=True)
    invoice_number = Column(String(32), unique=True, nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="RESTRICT"), nullable=False, index=True)
    student_auth_id = Column(Integer, nullable=False, index=True)
    service_type = Column(String(20), nullable=False, default="other")
    application_id = Column(Integer, nullable=True)
    title = Column(String(180), nullable=False)
    description = Column(Text)
    amount_toman = Column(BigInteger, nullable=False)
    due_date = Column(Date)
    payment_instructions = Column(Text)
    status = Column(String(20), nullable=False, default="issued", index=True)
    paid_at = Column(DateTime(timezone=True))
    payment_reference = Column(String(120))
    created_by_admin_id = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    student = relationship("Student")



class AssignedStudyTask(Base):
    __tablename__ = "assigned_study_tasks"
    __table_args__ = (
        CheckConstraint(
            "(mentor_assignment_id IS NOT NULL AND tutor_assignment_id IS NULL) OR "
            "(mentor_assignment_id IS NULL AND tutor_assignment_id IS NOT NULL)",
            name="ck_assigned_study_tasks_exactly_one_assignment",
        ),
        Index("ix_assigned_study_tasks_planned_at", "planned_at"),
    )

    id = Column(Integer, primary_key=True)
    student_auth_id = Column(Integer, nullable=False, index=True)
    mentor_assignment_id = Column(Integer, ForeignKey("mentor_assignments.id", ondelete="CASCADE"), nullable=True, index=True)
    tutor_assignment_id = Column(Integer, ForeignKey("tutor_assignments.id", ondelete="CASCADE"), nullable=True, index=True)
    title = Column(String(180), nullable=False)
    description = Column(Text)
    planned_at = Column(DateTime(timezone=True), nullable=False)
    duration_minutes = Column(Integer, nullable=False, default=60)
    status = Column(String(20), nullable=False, default="pending")
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)



class StudentNotification(Base):
    """Persistent, student-scoped notifications for meaningful portal events."""

    __tablename__ = "student_notifications"
    __table_args__ = (
        UniqueConstraint("dedupe_key", name="uq_student_notifications_dedupe_key"),
        Index("ix_student_notifications_student_created", "student_auth_id", "created_at"),
    )

    id = Column(Integer, primary_key=True)
    student_auth_id = Column(Integer, nullable=False, index=True)
    category = Column(String(30), nullable=False)
    title = Column(String(180), nullable=False)
    body = Column(String(700), nullable=False)
    href = Column(String(240), nullable=False)
    dedupe_key = Column(String(190), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    read_at = Column(DateTime(timezone=True))


class StudentActivity(Base):
    """Privacy-minimal, allow-listed student activity used for cohort retention."""

    __tablename__ = "student_activities"
    __table_args__ = (
        UniqueConstraint("student_auth_id", "event_type", "activity_date", name="uq_student_activities_student_event_date"),
        Index("ix_student_activities_event_date", "event_type", "activity_date"),
    )

    id = Column(Integer, primary_key=True)
    student_auth_id = Column(Integer, nullable=False, index=True)
    event_type = Column(String(40), nullable=False)
    activity_date = Column(Date, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
