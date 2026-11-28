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
from app.main import app, require_admin, require_student
from app.models import MentorshipApplication, Student, TutoringApplication

AUTHENTICATED_STUDENT = {
    "id": 41,
    "first_name": "آرمان",
    "last_name": "رضایی",
    "grade": "یازدهم",
    "field": "physics",
    "guardian_phone": "09123456789",
}

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
    original_terms_approved = settings.terms_approved
    settings.public_applications_enabled = True
    settings.privacy_contact_email = "privacy@example.test"
    settings.public_site_origin = "https://testserver"
    settings.terms_approved = True

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[require_student] = lambda: AUTHENTICATED_STUDENT.copy()
    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()
    settings.public_applications_enabled = original_enabled
    settings.privacy_contact_email = original_email
    settings.public_site_origin = original_origin
    settings.terms_approved = original_terms_approved
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
    assert student.auth_student_id == AUTHENTICATED_STUDENT["id"]
    assert student.first_name == AUTHENTICATED_STUDENT["first_name"]
    assert student.parent_phone == AUTHENTICATED_STUDENT["guardian_phone"]
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
    assert student.auth_student_id == AUTHENTICATED_STUDENT["id"]


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



def test_mentorship_and_tutoring_requests_reuse_the_authenticated_student(client, db_session):
    mentorship = client.post(
        "/mentorship-applications",
        json=valid_common_payload(),
        headers=same_origin_headers(),
    )
    tutoring = client.post(
        "/tutoring-applications",
        json={**valid_common_payload(), "topic": "مکانیک"},
        headers=same_origin_headers(),
    )
    assert mentorship.status_code == 201
    assert tutoring.status_code == 201
    assert db_session.query(Student).count() == 1
    assert db_session.query(MentorshipApplication).one().student_id == db_session.query(TutoringApplication).one().student_id


def test_student_application_inbox_only_returns_the_current_students_requests(client, db_session):
    created = client.post(
        "/mentorship-applications",
        json=valid_common_payload(),
        headers=same_origin_headers(),
    )
    assert created.status_code == 201
    own_request_id = created.json()["request_id"]

    other_student = Student(
        auth_student_id=99,
        first_name="دانش‌آموز دیگر",
        last_name="نمونه",
        grade="دهم",
        field="computer",
    )
    db_session.add(other_student)
    db_session.flush()
    db_session.add(TutoringApplication(
        student_id=other_student.id,
        field="computer",
        topic="الگوریتم",
        description="یادداشت دانش‌آموز دیگر",
        admin_note="یادداشت داخلی",
        status="reviewing",
    ))
    db_session.commit()

    response = client.get("/student/applications")
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["id"] == own_request_id
    assert body["items"][0]["kind"] == "mentorship"
    assert body["items"][0]["tracking_code"] == f"CH-{own_request_id:06d}"
    assert "admin_note" not in body["items"][0]
    assert "guardian_phone" not in body["items"][0]


def test_application_submission_rejects_mismatched_account_identity(client, db_session):
    mismatch = client.post(
        "/mentorship-applications",
        json={**valid_common_payload(), "field": "computer"},
        headers=same_origin_headers(),
    )
    assert mismatch.status_code == 422
    assert db_session.query(Student).count() == 0

    wrong_guardian = client.post(
        "/tutoring-applications",
        json={**valid_common_payload(), "guardian_phone": "09129998877", "topic": "جبر"},
        headers=same_origin_headers(),
    )
    assert wrong_guardian.status_code == 422
    assert db_session.query(Student).count() == 0


def test_application_submission_requires_a_student_session(client, db_session):
    app.dependency_overrides.pop(require_student, None)
    try:
        response = client.post(
            "/mentorship-applications",
            json=valid_common_payload(),
            headers=same_origin_headers(),
        )
    finally:
        app.dependency_overrides[require_student] = lambda: AUTHENTICATED_STUDENT.copy()
    assert response.status_code == 401
    assert db_session.query(Student).count() == 0


def test_application_inbox_requires_a_student_session(client):
    app.dependency_overrides.pop(require_student, None)
    try:
        response = client.get("/student/applications")
    finally:
        app.dependency_overrides[require_student] = lambda: AUTHENTICATED_STUDENT.copy()
    assert response.status_code == 401


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



def test_admin_inbox_status_and_internal_notes(client, db_session):
    app.dependency_overrides[require_admin] = lambda: {"id": 7}
    try:
        created = client.post(
            "/mentorship-applications",
            json=valid_common_payload(),
            headers=same_origin_headers(),
        )
        assert created.status_code == 201
        request_id = created.json()["request_id"]

        listing = client.get("/admin/applications?kind=mentorship")
        assert listing.status_code == 200
        assert listing.json()["total"] == 1
        assert listing.json()["items"][0]["student"]["first_name"] == "آرمان"

        detail = client.get(f"/admin/applications/mentorship/{request_id}")
        assert detail.status_code == 200
        assert detail.json()["student"]["guardian_phone"] == "+989123456789"

        changed = client.patch(
            f"/admin/applications/mentorship/{request_id}",
            json={"status": "reviewing"},
            headers=same_origin_headers(),
        )
        assert changed.status_code == 200
        assert changed.json()["status"] == "reviewing"

        noted = client.post(
            f"/admin/applications/mentorship/{request_id}/notes",
            json={"content": "تماس اولیه انجام شود"},
            headers=same_origin_headers(),
        )
        assert noted.status_code == 201
        assert noted.json()["admin_id"] == 7

        refreshed = client.get(f"/admin/applications/mentorship/{request_id}")
        assert refreshed.json()["internal_notes"][0]["content"] == "تماس اولیه انجام شود"
    finally:
        app.dependency_overrides.pop(require_admin, None)
