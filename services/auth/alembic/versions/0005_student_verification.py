"""Add one-time phone and guardian-consent verification challenges.

Revision ID: auth_0005_student_verification
Revises: auth_0004_teacher_users
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "auth_0005_student_verification"
down_revision: Union[str, None] = "auth_0004_teacher_users"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Historical checkbox acknowledgements are not independent guardian
    # verification. Existing accounts must complete the new OTP flow.
    with op.batch_alter_table("student_users") as batch:
        batch.alter_column(
            "guardian_consent_at",
            existing_type=sa.DateTime(timezone=True),
            nullable=True,
        )
    op.execute(
        "UPDATE student_users "
        "SET guardian_consent = false, guardian_consent_at = NULL, phone_verified = false"
    )

    op.create_table(
        "student_verification_codes",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("purpose", sa.String(length=32), nullable=False),
        sa.Column("destination_phone", sa.String(length=16), nullable=False),
        sa.Column("code_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["student_id"], ["student_users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_student_verification_codes_student_purpose",
        "student_verification_codes",
        ["student_id", "purpose"],
    )
    op.create_index(
        "ix_student_verification_codes_created_at",
        "student_verification_codes",
        ["created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_student_verification_codes_created_at", table_name="student_verification_codes")
    op.drop_index("ix_student_verification_codes_student_purpose", table_name="student_verification_codes")
    op.drop_table("student_verification_codes")
    op.execute(
        "UPDATE student_users "
        "SET guardian_consent_at = COALESCE(guardian_consent_at, created_at)"
    )
    with op.batch_alter_table("student_users") as batch:
        batch.alter_column(
            "guardian_consent_at",
            existing_type=sa.DateTime(timezone=True),
            nullable=False,
        )
