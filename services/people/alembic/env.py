import os
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.config import settings
from app.db import Base
from app import models  # noqa: F401 - register all models in Base.metadata

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Migrations use a dedicated owner/migrator role. The API process continues
# to use DB_URL (a restricted runtime role) through app.db.
database_url = os.getenv("MIGRATION_DB_URL") or settings.db_url
if not database_url:
    raise RuntimeError("MIGRATION_DB_URL (or DB_URL fallback) must be configured")

# ConfigParser treats '%' as interpolation syntax. Passwords should be
# generated as hex strings; escaping also makes arbitrary URLs safe here.
config.set_main_option("sqlalchemy.url", database_url.replace("%", "%%"))
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = database_url
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
