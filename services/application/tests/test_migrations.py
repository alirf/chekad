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

    thread_columns = {item["name"]: item for item in inspector.get_columns("student_message_threads")}
    invoice_columns = {item["name"]: item for item in inspector.get_columns("student_invoices")}
    assert thread_columns["advisor_assignment_id"]["nullable"] is True
    assert invoice_columns["amount_toman"]["nullable"] is False
    assert invoice_columns["student_auth_id"]["nullable"] is False
    assert any(index["name"] == "uq_student_message_threads_support_student" and index["unique"] for index in inspector.get_indexes("student_message_threads"))
    assert any(index["name"] == "uq_student_message_threads_advisor_assignment" and index["unique"] for index in inspector.get_indexes("student_message_threads"))
    weekly_constraints = inspector.get_unique_constraints("mentor_weekly_reports")
    assert any(constraint["name"] == "uq_mentor_weekly_reports_assignment_week" for constraint in weekly_constraints)
    assert any(index["name"] == "uq_mentor_assignments_active_application" and index["unique"] for index in inspector.get_indexes("mentor_assignments"))
    assert any(index["name"] == "uq_tutor_assignments_active_application" and index["unique"] for index in inspector.get_indexes("tutor_assignments"))

    message_columns = {item["name"]: item for item in inspector.get_columns("student_message_threads")}
    assert message_columns["tutor_assignment_id"]["nullable"] is True
    assert "assigned_study_tasks" in inspector.get_table_names()
    task_columns = {item["name"]: item for item in inspector.get_columns("assigned_study_tasks")}
    assert task_columns["student_auth_id"]["nullable"] is False
    assert task_columns["mentor_assignment_id"]["nullable"] is True
    assert task_columns["tutor_assignment_id"]["nullable"] is True
    assert any(index["name"] == "uq_student_message_threads_teacher_assignment" and index["unique"] for index in inspector.get_indexes("student_message_threads"))

    engine.dispose()
