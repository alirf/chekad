"""Associate application records with authenticated student accounts.

Revision ID: app_0004
Revises: app_0003
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "app_0004"
down_revision: Union[str, None] = "app_0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "students",
        sa.Column("auth_student_id", sa.Integer(), nullable=True),
    )
    op.create_index(
        "ix_students_auth_student_id",
        "students",
        ["auth_student_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_students_auth_student_id", table_name="students")
    op.drop_column("students", "auth_student_id")
