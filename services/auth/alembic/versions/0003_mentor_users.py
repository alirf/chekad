"""Add separately authenticated mentor accounts.

Revision ID: auth_0003_mentors
Revises: auth_0002_students
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "auth_0003_mentors"
down_revision: Union[str, None] = "auth_0002_students"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "mentor_users",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("mentor_profile_id", sa.Integer(), nullable=False),
        sa.Column("phone", sa.String(length=16), nullable=False),
        sa.Column("display_name", sa.String(length=180), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("mentor_profile_id", name="uq_mentor_users_profile"),
    )
    op.create_index("ix_mentor_users_mentor_profile_id", "mentor_users", ["mentor_profile_id"])
    op.create_index("ix_mentor_users_phone", "mentor_users", ["phone"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_mentor_users_phone", table_name="mentor_users")
    op.drop_index("ix_mentor_users_mentor_profile_id", table_name="mentor_users")
    op.drop_table("mentor_users")
