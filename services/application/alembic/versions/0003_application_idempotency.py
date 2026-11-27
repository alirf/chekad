"""Add idempotency columns to public applications.

Revision ID: app_0003
Revises: app_0002
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "app_0003"
down_revision: Union[str, None] = "app_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    for table in ("mentorship_applications", "tutoring_applications"):
        op.add_column(table, sa.Column("idempotency_key", sa.String(length=64), nullable=True))
        op.add_column(table, sa.Column("request_fingerprint", sa.String(length=64), nullable=True))
        op.create_index(f"uq_{table}_idempotency_key", table, ["idempotency_key"], unique=True)


def downgrade() -> None:
    for table in ("tutoring_applications", "mentorship_applications"):
        op.drop_index(f"uq_{table}_idempotency_key", table_name=table)
        op.drop_column(table, "request_fingerprint")
        op.drop_column(table, "idempotency_key")
