"""Add structured mentor and tutor offers with student confirmation.

Revision ID: app_0009_application_offers
Revises: app_0008_retention_notifications
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "app_0009_application_offers"
down_revision: Union[str, None] = "app_0008_retention_notifications"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "application_offers",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("application_kind", sa.String(length=20), nullable=False),
        sa.Column("application_id", sa.Integer(), nullable=False),
        sa.Column("person_id", sa.Integer(), nullable=False),
        sa.Column("person_name", sa.String(length=180), nullable=False),
        sa.Column("field", sa.String(length=20), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("price_toman", sa.BigInteger(), nullable=True),
        sa.Column("terms", sa.Text(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("created_by_admin_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("selected_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("application_kind", "application_id", "person_id", name="uq_application_offers_application_person"),
    )
    op.create_index("ix_application_offers_application_id", "application_offers", ["application_id"])
    op.create_index("ix_application_offers_person_id", "application_offers", ["person_id"])
    op.create_index("ix_application_offers_status", "application_offers", ["status"])
    op.create_index("ix_application_offers_application", "application_offers", ["application_kind", "application_id"])
    op.create_index("ix_application_offers_status_expiry", "application_offers", ["status", "expires_at"])


def downgrade() -> None:
    op.drop_index("ix_application_offers_status_expiry", table_name="application_offers")
    op.drop_index("ix_application_offers_application", table_name="application_offers")
    op.drop_index("ix_application_offers_status", table_name="application_offers")
    op.drop_index("ix_application_offers_person_id", table_name="application_offers")
    op.drop_index("ix_application_offers_application_id", table_name="application_offers")
    op.drop_table("application_offers")
