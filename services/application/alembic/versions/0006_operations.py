"""Complete student portal operations: assignment details, advisor threads and invoices.

Revision ID: app_0006_operations
Revises: app_0005
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "app_0006_operations"
down_revision: Union[str, None] = "app_0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("mentor_assignments", sa.Column("person_name", sa.String(length=180), nullable=True))
    op.add_column("tutor_assignments", sa.Column("person_name", sa.String(length=180), nullable=True))
    op.create_index(
        "uq_mentor_assignments_active_application",
        "mentor_assignments",
        ["application_id"],
        unique=True,
        sqlite_where=sa.text("status = 'active'"),
        postgresql_where=sa.text("status = 'active'"),
    )
    op.create_index(
        "uq_tutor_assignments_active_application",
        "tutor_assignments",
        ["application_id"],
        unique=True,
        sqlite_where=sa.text("status = 'active'"),
        postgresql_where=sa.text("status = 'active'"),
    )

    # Replace the one-thread-per-channel rule with one support thread per student
    # and one advisor thread per mentorship assignment.
    with op.batch_alter_table("student_message_threads") as batch:
        batch.drop_constraint("uq_student_message_thread_student_channel", type_="unique")
        batch.add_column(sa.Column("advisor_assignment_id", sa.Integer(), nullable=True))
        batch.create_foreign_key(
            "fk_student_message_threads_advisor_assignment",
            "mentor_assignments",
            ["advisor_assignment_id"],
            ["id"],
            ondelete="CASCADE",
        )

    op.create_index(
        "ix_student_message_threads_advisor_assignment_id",
        "student_message_threads",
        ["advisor_assignment_id"],
    )
    op.create_index(
        "uq_student_message_threads_support_student",
        "student_message_threads",
        ["student_auth_id"],
        unique=True,
        sqlite_where=sa.text("channel = 'support'"),
        postgresql_where=sa.text("channel = 'support'"),
    )
    with op.batch_alter_table("mentor_weekly_reports") as batch:
        batch.create_unique_constraint(
            "uq_mentor_weekly_reports_assignment_week",
            ["assignment_id", "week_number"],
        )

    op.create_index(
        "uq_student_message_threads_advisor_assignment",
        "student_message_threads",
        ["advisor_assignment_id"],
        unique=True,
        sqlite_where=sa.text("advisor_assignment_id IS NOT NULL"),
        postgresql_where=sa.text("advisor_assignment_id IS NOT NULL"),
    )

    op.create_table(
        "student_invoices",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("invoice_number", sa.String(length=32), nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("student_auth_id", sa.Integer(), nullable=False),
        sa.Column("service_type", sa.String(length=20), nullable=False, server_default="other"),
        sa.Column("application_id", sa.Integer(), nullable=True),
        sa.Column("title", sa.String(length=180), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("amount_toman", sa.BigInteger(), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("payment_instructions", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="issued"),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("payment_reference", sa.String(length=120), nullable=True),
        sa.Column("created_by_admin_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("invoice_number"),
    )
    op.create_index("ix_student_invoices_invoice_number", "student_invoices", ["invoice_number"], unique=True)
    op.create_index("ix_student_invoices_student_id", "student_invoices", ["student_id"])
    op.create_index("ix_student_invoices_student_auth_id", "student_invoices", ["student_auth_id"])
    op.create_index("ix_student_invoices_status", "student_invoices", ["status"])


def downgrade() -> None:
    op.drop_index("ix_student_invoices_status", table_name="student_invoices")
    op.drop_index("ix_student_invoices_student_auth_id", table_name="student_invoices")
    op.drop_index("ix_student_invoices_student_id", table_name="student_invoices")
    op.drop_index("ix_student_invoices_invoice_number", table_name="student_invoices")
    op.drop_table("student_invoices")

    with op.batch_alter_table("mentor_weekly_reports") as batch:
        batch.drop_constraint(
            "uq_mentor_weekly_reports_assignment_week",
            type_="unique",
        )
    op.drop_index("uq_student_message_threads_advisor_assignment", table_name="student_message_threads")
    op.drop_index("uq_student_message_threads_support_student", table_name="student_message_threads")
    op.drop_index("ix_student_message_threads_advisor_assignment_id", table_name="student_message_threads")
    with op.batch_alter_table("student_message_threads") as batch:
        batch.drop_constraint("fk_student_message_threads_advisor_assignment", type_="foreignkey")
        batch.drop_column("advisor_assignment_id")
        batch.create_unique_constraint(
            "uq_student_message_thread_student_channel",
            ["student_auth_id", "channel"],
        )

    op.drop_index("uq_tutor_assignments_active_application", table_name="tutor_assignments")
    op.drop_index("uq_mentor_assignments_active_application", table_name="mentor_assignments")
    op.drop_column("tutor_assignments", "person_name")
    op.drop_column("mentor_assignments", "person_name")
