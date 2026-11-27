"""Add public profile fields for mentors and tutors."""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "people_0002"
down_revision: Union[str, None] = "people_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    for column in (
        sa.Column("image_url", sa.String(1000), nullable=True),
        sa.Column("specialties", sa.String(500), nullable=True),
        sa.Column("experience", sa.Text(), nullable=True),
        sa.Column("medals", sa.Text(), nullable=True),
        sa.Column("education", sa.String(300), nullable=True),
    ):
        op.add_column("mentors", column)
    for column in (
        sa.Column("image_url", sa.String(1000), nullable=True),
        sa.Column("medals", sa.Text(), nullable=True),
        sa.Column("education", sa.String(300), nullable=True),
    ):
        op.add_column("tutors", column)


def downgrade() -> None:
    for column in ("education", "medals", "image_url"):
        op.drop_column("tutors", column)
    for column in ("education", "medals", "experience", "specialties", "image_url"):
        op.drop_column("mentors", column)
