"""Add student portal messaging, study reports and weekly planner.

Revision ID: app_0005
Revises: app_0004
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "app_0005"
down_revision: Union[str, None] = "app_0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "student_message_threads",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("student_auth_id", sa.Integer(), nullable=False),
        sa.Column("student_name", sa.String(length=180), nullable=False),
        sa.Column("channel", sa.String(length=20), nullable=False, server_default="support"),
        sa.Column("subject", sa.String(length=140), nullable=False, server_default="گفت‌وگو با پشتیبانی چکاد"),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="open"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_message_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("student_auth_id", "channel", name="uq_student_message_thread_student_channel"),
    )
    op.create_index("ix_student_message_threads_student_auth_id", "student_message_threads", ["student_auth_id"])
    op.create_index("ix_student_message_threads_status", "student_message_threads", ["status"])

    op.create_table(
        "student_messages",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("thread_id", sa.Integer(), sa.ForeignKey("student_message_threads.id", ondelete="CASCADE"), nullable=False),
        sa.Column("sender_type", sa.String(length=16), nullable=False),
        sa.Column("sender_id", sa.Integer(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_student_messages_thread_id", "student_messages", ["thread_id"])

    op.create_table(
        "student_study_reports",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("student_auth_id", sa.Integer(), nullable=False),
        sa.Column("report_date", sa.Date(), nullable=False),
        sa.Column("study_minutes", sa.Integer(), nullable=False),
        sa.Column("topics", sa.Text(), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("blockers", sa.Text(), nullable=True),
        sa.Column("next_step", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_student_study_reports_student_auth_id", "student_study_reports", ["student_auth_id"])
    op.create_index("ix_student_study_reports_report_date", "student_study_reports", ["report_date"])

    op.create_table(
        "student_study_tasks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("student_auth_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=180), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("planned_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False, server_default="60"),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_student_study_tasks_student_auth_id", "student_study_tasks", ["student_auth_id"])
    op.create_index("ix_student_study_tasks_planned_at", "student_study_tasks", ["planned_at"])
    op.create_index("ix_student_study_tasks_status", "student_study_tasks", ["status"])


def downgrade() -> None:
    op.drop_index("ix_student_study_tasks_status", table_name="student_study_tasks")
    op.drop_index("ix_student_study_tasks_planned_at", table_name="student_study_tasks")
    op.drop_index("ix_student_study_tasks_student_auth_id", table_name="student_study_tasks")
    op.drop_table("student_study_tasks")
    op.drop_index("ix_student_study_reports_report_date", table_name="student_study_reports")
    op.drop_index("ix_student_study_reports_student_auth_id", table_name="student_study_reports")
    op.drop_table("student_study_reports")
    op.drop_index("ix_student_messages_thread_id", table_name="student_messages")
    op.drop_table("student_messages")
    op.drop_index("ix_student_message_threads_status", table_name="student_message_threads")
    op.drop_index("ix_student_message_threads_student_auth_id", table_name="student_message_threads")
    op.drop_table("student_message_threads")
