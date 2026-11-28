"""Add student exam registration records.

Revision ID: content_0004_exam_registrations
Revises: content_0003
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "content_0004_exam_registrations"
down_revision: Union[str, None] = "content_0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "exam_registrations",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("exam_id", sa.Integer(), nullable=False),
        sa.Column("student_auth_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="registered"),
        sa.Column("registered_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["exam_id"], ["exams.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("exam_id", "student_auth_id", name="uq_exam_registration_student"),
    )
    op.create_index("ix_exam_registrations_exam_id", "exam_registrations", ["exam_id"])
    op.create_index("ix_exam_registrations_student_auth_id", "exam_registrations", ["student_auth_id"])
    op.create_index("ix_exam_registrations_status", "exam_registrations", ["status"])


def downgrade() -> None:
    op.drop_index("ix_exam_registrations_status", table_name="exam_registrations")
    op.drop_index("ix_exam_registrations_student_auth_id", table_name="exam_registrations")
    op.drop_index("ix_exam_registrations_exam_id", table_name="exam_registrations")
    op.drop_table("exam_registrations")
