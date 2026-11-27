import os

os.environ.setdefault("DB_URL", "sqlite:///./application-test-default.db")
os.environ.setdefault("SERVICE_NAME", "application-service")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import settings
from app.db import Base, get_db
from app.main import app
from app.models import MentorshipApplication, Student, TutoringApplication

TEST_ENGINE = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(
    bind=TEST_ENGINE,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
)


@pytest.fixture()
def client():
    Base.metadata.create_all(bind=TEST_ENGINE)
    original_enabled = settings.public_applications_enabled
    original_email = settings.privacy_contact_email
    original_origin = settings.public_site_origin
    settings.public_applications_enabled = True
    settings.privacy_contact_email = "privacy@example.test"
    settings.public_site_origin = "https://testserver"

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()
    settings.public_applications_enabled = original_enabled
    settings.privacy_contact_email = original_email
    settings.public_site_origin = original_origin
    Base.metadata.drop_all(bind=TEST_ENGINE)


@pytest.fixture()
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


def valid_common_payload():
    return {
        "first_name": "آرمان",
        "last_name": "رضایی",
        "grade": "یازدهم",
        "field": "physics",
        "guardian_phone": "۰۹۱۲۳۴۵۶۷۸۹",
        "guardian_consent": True,
        "privacy_accepted": True,
    }


def same_origin_headers():
    return {"Origin": "https://testserver"}


def test_mentorship_application_is_persisted_without_student_phone(client, db_session):
    response = client.post(
        "/mentorship-applications",
        json={
            **valid_common_payload(),
            "level": "در حال مطالعه",
            "goal": "برنامه‌ریزی و پیگیری",
            "notes": "توضیحات اختیاری",
        },
        headers=same_origin_headers(),
    )

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "received"
    assert body["request_id"] > 0
    assert "guardian_phone" not in body
    assert "آرمان" not in body

    student = db_session.query(Student).one()
    application = db_session.query(MentorshipApplication).one()
    assert student.phone is None
    assert student.parent_phone == "+989123456789"
    assert application.student_id == student.id
    assert application.guardian_consent_at is not None
    assert application.privacy_accepted_at is not None
    assert application.privacy_notice_version == "2026-11-27-v1"
    assert "برنامه‌ریزی و پیگیری" in application.student_note


def test_tutoring_application_is_persisted(client, db_session):
    response = client.post(
        "/tutoring-applications",
        json={
            **valid_common_payload(),
            "field": "computer",
            "topic": "الگوریتم و ساختمان داده",
            "goal": "رفع اشکال",
        },
        headers=same_origin_headers(),
    )

    assert response.status_code == 201
    assert response.json()["status"] == "received"

    student = db_session.query(Student).one()
    application = db_session.query(TutoringApplication).one()
    assert student.parent_phone == "+989123456789"
    assert application.topic == "الگوریتم و ساختمان داده"
    assert application.field == "computer"
    assert application.guardian_consent_at is not None
    assert application.privacy_accepted_at is not None


def test_origin_with_path_is_rejected(client, db_session):
    response = client.post(
        "/mentorship-applications",
        json=valid_common_payload(),
        headers={"Origin": "https://testserver/untrusted"},
    )
    assert response.status_code == 403
    assert db_session.query(Student).count() == 0


def test_cross_origin_submission_is_rejected(client, db_session):
    response = client.post(
        "/mentorship-applications",
        json=valid_common_payload(),
        headers={"Origin": "https://attacker.example"},
    )

    assert response.status_code == 403
    assert db_session.query(Student).count() == 0
    assert db_session.query(MentorshipApplication).count() == 0


def test_missing_guardian_consent_is_rejected(client, db_session):
    response = client.post(
        "/mentorship-applications",
        json={**valid_common_payload(), "guardian_consent": False},
        headers=same_origin_headers(),
    )

    assert response.status_code == 422
    assert db_session.query(Student).count() == 0


def test_missing_privacy_acceptance_is_rejected(client, db_session):
    response = client.post(
        "/mentorship-applications",
        json={**valid_common_payload(), "privacy_accepted": False},
        headers=same_origin_headers(),
    )

    assert response.status_code == 422
    assert db_session.query(Student).count() == 0


def test_invalid_guardian_phone_is_rejected(client, db_session):
    response = client.post(
        "/tutoring-applications",
        json={
            **valid_common_payload(),
            "guardian_phone": "12345",
            "topic": "فیزیک",
        },
        headers=same_origin_headers(),
    )

    assert response.status_code == 422
    assert db_session.query(Student).count() == 0


def test_admin_stats_requires_authentication(client):
    response = client.get("/admin/stats")
    assert response.status_code == 401


def test_intake_is_disabled_without_runtime_activation(client, db_session):
    settings.public_applications_enabled = False
    response = client.post(
        "/mentorship-applications",
        json=valid_common_payload(),
        headers=same_origin_headers(),
    )
    assert response.status_code == 503
    assert db_session.query(Student).count() == 0


def test_intake_is_disabled_without_https_canonical_origin(client, db_session):
    settings.public_site_origin = "http://testserver"
    response = client.post(
        "/mentorship-applications",
        json=valid_common_payload(),
        headers={"Origin": "http://testserver"},
    )
    assert response.status_code == 503
    assert db_session.query(Student).count() == 0


def test_request_requires_origin_header(client, db_session):
    response = client.post(
        "/mentorship-applications",
        json=valid_common_payload(),
    )

    assert response.status_code == 403
    assert db_session.query(Student).count() == 0
