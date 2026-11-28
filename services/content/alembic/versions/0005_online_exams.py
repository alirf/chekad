"""Add online exam questions, attempts, answers and result publication.

Revision ID: content_0005_online_exams
Revises: content_0004_exam_registrations
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "content_0005_online_exams"
down_revision: Union[str, None] = "content_0004_exam_registrations"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "exams",
        sa.Column("results_published", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_table(
        "exam_questions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("exam_id", sa.Integer(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("question_type", sa.String(length=24), nullable=False, server_default="single_choice"),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("options", sa.JSON(), nullable=True),
        sa.Column("correct_answer", sa.Text(), nullable=True),
        sa.Column("points", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["exam_id"], ["exams.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("exam_id", "position", name="uq_exam_questions_exam_position"),
    )
    op.create_index("ix_exam_questions_exam_id", "exam_questions", ["exam_id"])

    op.create_table(
        "exam_attempts",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("exam_id", sa.Integer(), nullable=False),
        sa.Column("registration_id", sa.Integer(), nullable=False),
        sa.Column("student_auth_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="in_progress"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deadline_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("max_score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("earned_score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("graded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["exam_id"], ["exams.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["registration_id"], ["exam_registrations.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("exam_id", "student_auth_id", name="uq_exam_attempt_student"),
    )
    op.create_index("ix_exam_attempts_exam_id", "exam_attempts", ["exam_id"])
    op.create_index("ix_exam_attempts_registration_id", "exam_attempts", ["registration_id"])
    op.create_index("ix_exam_attempts_student_auth_id", "exam_attempts", ["student_auth_id"])
    op.create_index("ix_exam_attempts_status", "exam_attempts", ["status"])

    op.create_table(
        "exam_answers",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("attempt_id", sa.Integer(), nullable=False),
        sa.Column("question_id", sa.Integer(), nullable=False),
        sa.Column("answer_text", sa.Text(), nullable=False, server_default=""),
        sa.Column("is_correct", sa.Boolean(), nullable=True),
        sa.Column("earned_points", sa.Integer(), nullable=True),
        sa.Column("grader_note", sa.Text(), nullable=True),
        sa.Column("graded_by_admin_id", sa.Integer(), nullable=True),
        sa.Column("graded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["attempt_id"], ["exam_attempts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["question_id"], ["exam_questions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("attempt_id", "question_id", name="uq_exam_answer_attempt_question"),
    )
    op.create_index("ix_exam_answers_attempt_id", "exam_answers", ["attempt_id"])
    op.create_index("ix_exam_answers_question_id", "exam_answers", ["question_id"])


def downgrade() -> None:
    op.drop_index("ix_exam_answers_question_id", table_name="exam_answers")
    op.drop_index("ix_exam_answers_attempt_id", table_name="exam_answers")
    op.drop_table("exam_answers")
    op.drop_index("ix_exam_attempts_status", table_name="exam_attempts")
    op.drop_index("ix_exam_attempts_student_auth_id", table_name="exam_attempts")
    op.drop_index("ix_exam_attempts_registration_id", table_name="exam_attempts")
    op.drop_index("ix_exam_attempts_exam_id", table_name="exam_attempts")
    op.drop_table("exam_attempts")
    op.drop_index("ix_exam_questions_exam_id", table_name="exam_questions")
    op.drop_table("exam_questions")
    op.drop_column("exams", "results_published")
