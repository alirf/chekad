"""Add guardian-consent audit fields and minimize student contact data.

Revision ID: app_0002
Revises: app_0001
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "app_0002"
down_revision: Union[str, None] = "app_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Contact information for public applications belongs to a parent/guardian,
    # not the student. Existing legacy student phone values remain unchanged.
    with op.batch_alter_table("students") as batch_op:
        batch_op.alter_column(
            "phone",
            existing_type=sa.String(length=20),
            nullable=True,
        )

    # Do not fabricate consent for legacy requests. Existing records receive
    # NULL values and are distinguishable from new consented submissions.
    for table in ("mentorship_applications", "tutoring_applications"):
        with op.batch_alter_table(table) as batch_op:
            batch_op.add_column(
                sa.Column("guardian_consent_at", sa.DateTime(timezone=True), nullable=True)
            )
            batch_op.add_column(
                sa.Column("privacy_accepted_at", sa.DateTime(timezone=True), nullable=True)
            )
            batch_op.add_column(
                sa.Column("privacy_notice_version", sa.String(length=50), nullable=True)
            )


def downgrade() -> None:
    for table in ("tutoring_applications", "mentorship_applications"):
        with op.batch_alter_table(table) as batch_op:
            batch_op.drop_column("privacy_notice_version")
            batch_op.drop_column("privacy_accepted_at")
            batch_op.drop_column("guardian_consent_at")

    # A downgrade can fail if new records have NULL student phones.
    with op.batch_alter_table("students") as batch_op:
        batch_op.alter_column(
            "phone",
            existing_type=sa.String(length=20),
            nullable=False,
        )
