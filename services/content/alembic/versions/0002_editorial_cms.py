"""Add editable pages, articles and exams."""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "content_0002"
down_revision: Union[str, None] = "content_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "site_pages",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("slug", sa.String(120), nullable=False, unique=True),
        sa.Column("title", sa.String(240), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("content", sa.Text(), nullable=False, server_default=""),
        sa.Column("image_url", sa.String(1000)),
        sa.Column("status", sa.String(20), nullable=False, server_default="draft"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_site_pages_slug", "site_pages", ["slug"], unique=True)
    op.create_index("ix_site_pages_status", "site_pages", ["status"])
    op.create_table(
        "articles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("slug", sa.String(160), nullable=False, unique=True),
        sa.Column("title", sa.String(240), nullable=False),
        sa.Column("excerpt", sa.Text(), nullable=False, server_default=""),
        sa.Column("body", sa.Text(), nullable=False, server_default=""),
        sa.Column("category", sa.String(80), nullable=False, server_default="عمومی"),
        sa.Column("tags", sa.String(500), nullable=False, server_default=""),
        sa.Column("cover_image_url", sa.String(1000)),
        sa.Column("status", sa.String(20), nullable=False, server_default="draft"),
        sa.Column("published_at", sa.DateTime(timezone=True)),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_articles_slug", "articles", ["slug"], unique=True)
    op.create_index("ix_articles_category", "articles", ["category"])
    op.create_index("ix_articles_status", "articles", ["status"])
    op.create_table(
        "exams",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("slug", sa.String(160), nullable=False, unique=True),
        sa.Column("title", sa.String(240), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("field", sa.String(20), nullable=False),
        sa.Column("stage", sa.String(80), nullable=False, server_default=""),
        sa.Column("starts_at", sa.String(80), nullable=False, server_default=""),
        sa.Column("duration_minutes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("registration_url", sa.String(1000)),
        sa.Column("status", sa.String(20), nullable=False, server_default="draft"),
        sa.Column("cover_image_url", sa.String(1000)),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_exams_slug", "exams", ["slug"], unique=True)
    op.create_index("ix_exams_field", "exams", ["field"])
    op.create_index("ix_exams_status", "exams", ["status"])


def downgrade() -> None:
    for table, index in [("exams", "ix_exams_status"), ("exams", "ix_exams_field"), ("exams", "ix_exams_slug"),
                         ("articles", "ix_articles_status"), ("articles", "ix_articles_category"), ("articles", "ix_articles_slug"),
                         ("site_pages", "ix_site_pages_status"), ("site_pages", "ix_site_pages_slug")]:
        op.drop_index(index, table_name=table)
    op.drop_table("exams")
    op.drop_table("articles")
    op.drop_table("site_pages")
