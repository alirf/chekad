"""Add structured page builder and SEO fields."""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "content_0003"
down_revision: Union[str, None] = "content_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("site_pages", sa.Column("sections", sa.JSON(), nullable=False, server_default="[]"))
    op.add_column("site_pages", sa.Column("layout", sa.String(24), nullable=False, server_default="standard"))
    op.add_column("site_pages", sa.Column("seo_title", sa.String(240), nullable=True))
    op.add_column("site_pages", sa.Column("seo_description", sa.String(320), nullable=True))


def downgrade() -> None:
    op.drop_column("site_pages", "seo_description")
    op.drop_column("site_pages", "seo_title")
    op.drop_column("site_pages", "layout")
    op.drop_column("site_pages", "sections")
