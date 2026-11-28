"""Add persistent student notifications and privacy-minimal retention activity.

Revision ID: app_0008_retention_notifications
Revises: app_0007_teacher_weekly_plan
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "app_0008_retention_notifications"
down_revision: Union[str, None] = "app_0007_teacher_weekly_plan"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "student_notifications",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("student_auth_id", sa.Integer(), nullable=False),
        sa.Column("category", sa.String(30), nullable=False),
        sa.Column("title", sa.String(180), nullable=False),
        sa.Column("body", sa.String(700), nullable=False),
        sa.Column("href", sa.String(240), nullable=False),
        sa.Column("dedupe_key", sa.String(190), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True)),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("dedupe_key", name="uq_student_notifications_dedupe_key"),
    )
    op.create_index("ix_student_notifications_student_auth_id", "student_notifications", ["student_auth_id"])
    op.create_index("ix_student_notifications_student_created", "student_notifications", ["student_auth_id", "created_at"])
    op.create_table(
        "student_activities",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("student_auth_id", sa.Integer(), nullable=False),
        sa.Column("event_type", sa.String(40), nullable=False),
        sa.Column("activity_date", sa.Date(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("student_auth_id", "event_type", "activity_date", name="uq_student_activities_student_event_date"),
    )
    op.create_index("ix_student_activities_student_auth_id", "student_activities", ["student_auth_id"])
    op.create_index("ix_student_activities_activity_date", "student_activities", ["activity_date"])
    op.create_index("ix_student_activities_event_date", "student_activities", ["event_type", "activity_date"])


def downgrade() -> None:
    op.drop_index("ix_student_activities_event_date", table_name="student_activities")
    op.drop_index("ix_student_activities_activity_date", table_name="student_activities")
    op.drop_index("ix_student_activities_student_auth_id", table_name="student_activities")
    op.drop_table("student_activities")
    op.drop_index("ix_student_notifications_student_created", table_name="student_notifications")
    op.drop_index("ix_student_notifications_student_auth_id", table_name="student_notifications")
    op.drop_table("student_notifications")
