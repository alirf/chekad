"""Add independent tutor/teacher accounts.

Revision ID: auth_0004_teacher_users
Revises: auth_0003_mentors
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "auth_0004_teacher_users"
down_revision: Union[str, None] = "auth_0003_mentors"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "teacher_users",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("tutor_profile_id", sa.Integer(), nullable=False),
        sa.Column("phone", sa.String(length=16), nullable=False),
        sa.Column("display_name", sa.String(length=180), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tutor_profile_id"),
    )
    op.create_index("ix_teacher_users_tutor_profile_id", "teacher_users", ["tutor_profile_id"])
    op.create_index("ix_teacher_users_phone", "teacher_users", ["phone"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_teacher_users_phone", table_name="teacher_users")
    op.drop_index("ix_teacher_users_tutor_profile_id", table_name="teacher_users")
    op.drop_table("teacher_users")
