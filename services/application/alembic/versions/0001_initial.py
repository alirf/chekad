"""Initial schema for application-service."""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "app_0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "students",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("first_name", sa.String(length=100), nullable=False),
        sa.Column("last_name", sa.String(length=100), nullable=False),
        sa.Column("phone", sa.String(length=20), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("grade", sa.String(length=20), nullable=True),
        sa.Column("field", sa.String(length=20), nullable=False),
        sa.Column("parent_phone", sa.String(length=20), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_students_phone", "students", ["phone"], unique=False)

    op.create_table(
        "mentorship_packages",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("duration_days", sa.Integer(), nullable=False),
        sa.Column("sessions_per_week", sa.Integer(), nullable=False),
        sa.Column("session_duration_minutes", sa.Integer(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "mentorship_applications",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("package_id", sa.Integer(), nullable=True),
        sa.Column("field", sa.String(length=20), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("preferred_schedule", sa.String(length=255), nullable=True),
        sa.Column("student_note", sa.Text(), nullable=True),
        sa.Column("admin_note", sa.Text(), nullable=True),
        sa.Column("reject_reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["package_id"], ["mentorship_packages.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_mentorship_applications_student_id", "mentorship_applications", ["student_id"], unique=False)
    op.create_index("ix_mentorship_applications_status", "mentorship_applications", ["status"], unique=False)

    op.create_table(
        "mentor_assignments",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("application_id", sa.Integer(), nullable=False),
        sa.Column("mentor_id", sa.Integer(), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["application_id"], ["mentorship_applications.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_mentor_assignments_application_id", "mentor_assignments", ["application_id"], unique=False)
    op.create_index("ix_mentor_assignments_mentor_id", "mentor_assignments", ["mentor_id"], unique=False)

    op.create_table(
        "mentor_sessions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("assignment_id", sa.Integer(), nullable=False),
        sa.Column("session_number", sa.Integer(), nullable=False),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["assignment_id"], ["mentor_assignments.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_mentor_sessions_assignment_id", "mentor_sessions", ["assignment_id"], unique=False)

    op.create_table(
        "mentor_weekly_reports",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("assignment_id", sa.Integer(), nullable=False),
        sa.Column("week_number", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["assignment_id"], ["mentor_assignments.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_mentor_weekly_reports_assignment_id", "mentor_weekly_reports", ["assignment_id"], unique=False)

    op.create_table(
        "tutoring_applications",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("field", sa.String(length=20), nullable=False),
        sa.Column("topic", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("admin_note", sa.Text(), nullable=True),
        sa.Column("reject_reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_tutoring_applications_student_id", "tutoring_applications", ["student_id"], unique=False)
    op.create_index("ix_tutoring_applications_status", "tutoring_applications", ["status"], unique=False)

    op.create_table(
        "tutor_assignments",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("application_id", sa.Integer(), nullable=False),
        sa.Column("tutor_id", sa.Integer(), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["application_id"], ["tutoring_applications.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_tutor_assignments_application_id", "tutor_assignments", ["application_id"], unique=False)
    op.create_index("ix_tutor_assignments_tutor_id", "tutor_assignments", ["tutor_id"], unique=False)

    op.create_table(
        "tutor_sessions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("assignment_id", sa.Integer(), nullable=False),
        sa.Column("session_number", sa.Integer(), nullable=False),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration_minutes", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["assignment_id"], ["tutor_assignments.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_tutor_sessions_assignment_id", "tutor_sessions", ["assignment_id"], unique=False)

    op.create_table(
        "internal_notes",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("application_type", sa.String(length=20), nullable=False),
        sa.Column("application_id", sa.Integer(), nullable=False),
        sa.Column("admin_id", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("internal_notes")
    op.drop_index("ix_tutor_sessions_assignment_id", table_name="tutor_sessions")
    op.drop_table("tutor_sessions")
    op.drop_index("ix_tutor_assignments_tutor_id", table_name="tutor_assignments")
    op.drop_index("ix_tutor_assignments_application_id", table_name="tutor_assignments")
    op.drop_table("tutor_assignments")
    op.drop_index("ix_tutoring_applications_status", table_name="tutoring_applications")
    op.drop_index("ix_tutoring_applications_student_id", table_name="tutoring_applications")
    op.drop_table("tutoring_applications")
    op.drop_index("ix_mentor_weekly_reports_assignment_id", table_name="mentor_weekly_reports")
    op.drop_table("mentor_weekly_reports")
    op.drop_index("ix_mentor_sessions_assignment_id", table_name="mentor_sessions")
    op.drop_table("mentor_sessions")
    op.drop_index("ix_mentor_assignments_mentor_id", table_name="mentor_assignments")
    op.drop_index("ix_mentor_assignments_application_id", table_name="mentor_assignments")
    op.drop_table("mentor_assignments")
    op.drop_index("ix_mentorship_applications_status", table_name="mentorship_applications")
    op.drop_index("ix_mentorship_applications_student_id", table_name="mentorship_applications")
    op.drop_table("mentorship_applications")
    op.drop_table("mentorship_packages")
    op.drop_index("ix_students_phone", table_name="students")
    op.drop_table("students")
