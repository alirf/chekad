from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect


def test_initial_and_privacy_migrations_upgrade_cleanly(tmp_path, monkeypatch):
    database_url = f"sqlite:///{tmp_path / 'chekad-migration-test.db'}"
    monkeypatch.setenv("MIGRATION_DB_URL", database_url)

    config = Config("alembic.ini")
    command.upgrade(config, "head")

    engine = create_engine(database_url)
    inspector = inspect(engine)

    student_columns = {
        item["name"]: item for item in inspector.get_columns("students")
    }
    mentorship_columns = {
        item["name"]: item for item in inspector.get_columns("mentorship_applications")
    }
    tutoring_columns = {
        item["name"]: item for item in inspector.get_columns("tutoring_applications")
    }

    assert student_columns["phone"]["nullable"] is True
    assert mentorship_columns["guardian_consent_at"]["nullable"] is True
    assert mentorship_columns["privacy_accepted_at"]["nullable"] is True
    assert mentorship_columns["privacy_notice_version"]["nullable"] is True
    assert tutoring_columns["guardian_consent_at"]["nullable"] is True
    assert tutoring_columns["privacy_accepted_at"]["nullable"] is True
    assert tutoring_columns["privacy_notice_version"]["nullable"] is True

    engine.dispose()
