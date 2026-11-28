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
    assert student_columns["auth_student_id"]["nullable"] is True
    assert mentorship_columns["guardian_consent_at"]["nullable"] is True
    assert mentorship_columns["privacy_accepted_at"]["nullable"] is True
    assert mentorship_columns["privacy_notice_version"]["nullable"] is True
    assert tutoring_columns["guardian_consent_at"]["nullable"] is True
    assert tutoring_columns["privacy_accepted_at"]["nullable"] is True
    assert tutoring_columns["privacy_notice_version"]["nullable"] is True
    assert mentorship_columns["idempotency_key"]["nullable"] is True
    assert mentorship_columns["request_fingerprint"]["nullable"] is True
    assert tutoring_columns["idempotency_key"]["nullable"] is True
    assert tutoring_columns["request_fingerprint"]["nullable"] is True
    assert any(index["name"] == "ix_students_auth_student_id" and index["unique"] for index in inspector.get_indexes("students"))

    engine.dispose()
