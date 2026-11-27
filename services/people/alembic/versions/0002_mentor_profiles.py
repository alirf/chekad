"""Add public profile fields for mentors and tutors."""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "people_0002"
down_revision: Union[str, None] = "people_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    for table in ("mentors", "tutors"):
        op.add_column(table, sa.Column("image_url", sa.String(1000), nullable=True))
        op.add_column(table, sa.Column("specialties", sa.String(500), nullable=True))
        op.add_column(table, sa.Column("experience", sa.Text(), nullable=True))
        op.add_column(table, sa.Column("medals", sa.Text(), nullable=True))
        op.add_column(table, sa.Column("education", sa.String(300), nullable=True))


def downgrade() -> None:
    for table in ("tutors", "mentors"):
        for column in ("education", "medals", "experience", "specialties", "image_url"):
            op.drop_column(table, column)
