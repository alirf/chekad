"""Add tutor conversations and mentor-managed weekly study plans.

Revision ID: app_0007_teacher_weekly_plan
Revises: app_0006_operations
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "app_0007_teacher_weekly_plan"
down_revision: Union[str, None] = "app_0006_operations"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("student_message_threads") as batch:
        batch.add_column(sa.Column("tutor_assignment_id", sa.Integer(), nullable=True))
        batch.create_foreign_key(
            "fk_student_message_threads_tutor_assignment",
            "tutor_assignments",
            ["tutor_assignment_id"],
            ["id"],
            ondelete="CASCADE",
        )
    op.create_index(
        "ix_student_message_threads_tutor_assignment_id",
        "student_message_threads",
        ["tutor_assignment_id"],
    )
    op.create_index(
        "uq_student_message_threads_teacher_assignment",
        "student_message_threads",
        ["tutor_assignment_id"],
        unique=True,
        sqlite_where=sa.text("tutor_assignment_id IS NOT NULL"),
        postgresql_where=sa.text("tutor_assignment_id IS NOT NULL"),
    )

    op.create_table(
        "assigned_study_tasks",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("student_auth_id", sa.Integer(), nullable=False),
        sa.Column("mentor_assignment_id", sa.Integer(), nullable=True),
        sa.Column("tutor_assignment_id", sa.Integer(), nullable=True),
        sa.Column("title", sa.String(length=180), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("planned_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False, server_default="60"),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "(mentor_assignment_id IS NOT NULL AND tutor_assignment_id IS NULL) OR "
            "(mentor_assignment_id IS NULL AND tutor_assignment_id IS NOT NULL)",
            name="ck_assigned_study_tasks_exactly_one_assignment",
        ),
        sa.ForeignKeyConstraint(["mentor_assignment_id"], ["mentor_assignments.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tutor_assignment_id"], ["tutor_assignments.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_assigned_study_tasks_student_auth_id", "assigned_study_tasks", ["student_auth_id"])
    op.create_index("ix_assigned_study_tasks_mentor_assignment_id", "assigned_study_tasks", ["mentor_assignment_id"])
    op.create_index("ix_assigned_study_tasks_tutor_assignment_id", "assigned_study_tasks", ["tutor_assignment_id"])
    op.create_index("ix_assigned_study_tasks_planned_at", "assigned_study_tasks", ["planned_at"])


def downgrade() -> None:
    op.drop_index("ix_assigned_study_tasks_planned_at", table_name="assigned_study_tasks")
    op.drop_index("ix_assigned_study_tasks_tutor_assignment_id", table_name="assigned_study_tasks")
    op.drop_index("ix_assigned_study_tasks_mentor_assignment_id", table_name="assigned_study_tasks")
    op.drop_index("ix_assigned_study_tasks_student_auth_id", table_name="assigned_study_tasks")
    op.drop_table("assigned_study_tasks")
    op.drop_index("uq_student_message_threads_teacher_assignment", table_name="student_message_threads")
    op.drop_index("ix_student_message_threads_tutor_assignment_id", table_name="student_message_threads")
    with op.batch_alter_table("student_message_threads") as batch:
        batch.drop_constraint("fk_student_message_threads_tutor_assignment", type_="foreignkey")
        batch.drop_column("tutor_assignment_id")
