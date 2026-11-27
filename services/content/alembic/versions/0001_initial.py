"""Initial schema for content-service."""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "content_0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "site_content",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("key", sa.String(length=100), nullable=False),
        sa.Column("value", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_site_content_key", "site_content", ["key"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_site_content_key", table_name="site_content")
    op.drop_table("site_content")
