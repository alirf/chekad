"""Add student accounts to auth-service."""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "auth_0002_students"
down_revision: Union[str, None] = "auth_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "student_users",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("phone", sa.String(length=16), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("first_name", sa.String(length=80), nullable=False),
        sa.Column("last_name", sa.String(length=80), nullable=False),
        sa.Column("grade", sa.String(length=24), nullable=False),
        sa.Column("field", sa.String(length=24), nullable=False),
        sa.Column("guardian_phone", sa.String(length=16), nullable=False),
        sa.Column("guardian_consent", sa.Boolean(), nullable=False),
        sa.Column("guardian_consent_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("privacy_accepted_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("phone_verified", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_student_users_phone", "student_users", ["phone"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_student_users_phone", table_name="student_users")
    op.drop_table("student_users")
