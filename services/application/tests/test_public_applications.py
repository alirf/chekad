import os

os.environ.setdefault("DB_URL", "sqlite:///./application-test-default.db")
os.environ.setdefault("SERVICE_NAME", "application-service")

from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import settings
from app.db import Base, get_db
from app.main import app, require_admin, require_student
from app.models import MentorshipApplication, Student, StudentInvoice, TutoringApplication
import app.purge_expired_applications as retention_module
from app.purge_expired_applications import student_is_referenced

AUTHENTICATED_STUDENT = {
    "id": 41,
    "first_name": "آرمان",
    "last_name": "رضایی",
    "grade": "یازدهم",
    "field": "physics",
    "guardian_phone": "09123456789",
    "phone_verified": True,
    "guardian_consent": True,
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
    assert student.parent_phone == "+989123456789"
    assert application.student_id == student.id
    assert application.guardian_consent_at is not None
    assert application.privacy_accepted_at is not None
    assert application.privacy_notice_version == "2026-11-28-v4"
    assert "برنامه‌ریزی و پیگیری" in application.student_note


def test_tutoring_application_is_persisted(client, db_session, monkeypatch):
    monkeypatch.setitem(AUTHENTICATED_STUDENT, "field", "computer")
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


def test_retention_preserves_student_with_historical_invoice(db_session):
    student = Student(
        auth_student_id=7001,
        first_name="آرمان",
        last_name="رضایی",
        grade="یازدهم",
        field="physics",
    )
    db_session.add(student)
    db_session.commit()
    db_session.refresh(student)

    db_session.add(StudentInvoice(
        invoice_number="CH-RETENTION-0001",
        student_id=student.id,
        student_auth_id=7001,
        service_type="mentorship",
        title="فاکتور تاریخی منتورینگ",
        amount_toman=250000,
        status="paid",
        created_by_admin_id=7,
    ))
    db_session.commit()

    assert student_is_referenced(db_session, student.id) is True


def test_retention_purges_expired_request_but_keeps_student_with_invoice(db_session, monkeypatch):
    student = Student(
        auth_student_id=7002,
        first_name="مینا",
        last_name="نمونه",
        grade="دهم",
        field="computer",
    )
    db_session.add(student)
    db_session.flush()

    application = MentorshipApplication(
        student_id=student.id,
        field="computer",
        status="completed",
        created_at=datetime.now(timezone.utc) - timedelta(days=400),
    )
    db_session.add(application)
    db_session.flush()

    invoice = StudentInvoice(
        invoice_number="CH-RETENTION-0002",
        student_id=student.id,
        student_auth_id=7002,
        service_type="other",
        title="فاکتور تاریخی مستقل",
        amount_toman=180000,
        status="paid",
        created_by_admin_id=7,
    )
    db_session.add(invoice)
    db_session.commit()
    student_id = student.id
    application_id = application.id
    invoice_id = invoice.id

    monkeypatch.setattr(retention_module, "SessionLocal", TestingSessionLocal)
    monkeypatch.setattr(
        retention_module,
        "cutoff_date",
        lambda: datetime.now(timezone.utc) - timedelta(days=365),
    )

    result = retention_module.purge_expired_applications()

    assert result == (1, 0, 0)
    db_session.expire_all()
    assert db_session.get(MentorshipApplication, application_id) is None
    assert db_session.get(Student, student_id) is not None
    assert db_session.get(StudentInvoice, invoice_id) is not None


def test_retention_keeps_request_referenced_by_its_invoice(db_session, monkeypatch):
    student = Student(
        auth_student_id=7003,
        first_name="سارا",
        last_name="نمونه",
        grade="یازدهم",
        field="physics",
    )
    db_session.add(student)
    db_session.flush()

    application = MentorshipApplication(
        student_id=student.id,
        field="physics",
        status="completed",
        created_at=datetime.now(timezone.utc) - timedelta(days=400),
    )
    db_session.add(application)
    db_session.flush()

    invoice = StudentInvoice(
        invoice_number="CH-RETENTION-0003",
        student_id=student.id,
        student_auth_id=7003,
        service_type="mentorship",
        application_id=application.id,
        title="فاکتور منتورینگ مرتبط",
        amount_toman=300000,
        status="paid",
        created_by_admin_id=7,
    )
    db_session.add(invoice)
    db_session.commit()
    student_id = student.id
    application_id = application.id
    invoice_id = invoice.id

    monkeypatch.setattr(retention_module, "SessionLocal", TestingSessionLocal)
    monkeypatch.setattr(
        retention_module,
        "cutoff_date",
        lambda: datetime.now(timezone.utc) - timedelta(days=365),
    )

    result = retention_module.purge_expired_applications()

    assert result == (0, 0, 0)
    db_session.expire_all()
    assert db_session.get(MentorshipApplication, application_id) is not None
    assert db_session.get(Student, student_id) is not None
    assert db_session.get(StudentInvoice, invoice_id) is not None


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


def test_application_status_state_machine_rejects_skipped_workflow_steps(client, db_session):
    app.dependency_overrides[require_admin] = lambda: {"id": 7}
    try:
        created = client.post(
            "/mentorship-applications",
            json=valid_common_payload(),
            headers=same_origin_headers(),
        )
        assert created.status_code == 201
        request_id = created.json()["request_id"]

        skipped = client.patch(
            f"/admin/applications/mentorship/{request_id}",
            json={"status": "active"},
            headers=same_origin_headers(),
        )
        assert skipped.status_code == 409

        accepted_without_selection = client.patch(
            f"/admin/applications/mentorship/{request_id}",
            json={"status": "accepted"},
            headers=same_origin_headers(),
        )
        assert accepted_without_selection.status_code == 409

        reviewing = client.patch(
            f"/admin/applications/mentorship/{request_id}",
            json={"status": "reviewing"},
            headers=same_origin_headers(),
        )
        assert reviewing.status_code == 200
        reverse = client.patch(
            f"/admin/applications/mentorship/{request_id}",
            json={"status": "new"},
            headers=same_origin_headers(),
        )
        assert reverse.status_code == 409

        detail = client.get(f"/admin/applications/mentorship/{request_id}")
        assert detail.json()["allowed_transitions"] == ["cancelled", "rejected", "waiting_for_student"]
    finally:
        app.dependency_overrides.pop(require_admin, None)


def test_idempotency_key_returns_original_application_and_rejects_changed_payload(client, db_session):
    headers = {**same_origin_headers(), "Idempotency-Key": "retry-safe-request-000001"}
    payload = {
        **valid_common_payload(),
        "level": "در حال مطالعه",
        "goal": "برنامه‌ریزی",
    }

    first = client.post("/mentorship-applications", json=payload, headers=headers)
    retry = client.post("/mentorship-applications", json=payload, headers=headers)

    assert first.status_code == 201
    assert retry.status_code == 200
    assert retry.json()["request_id"] == first.json()["request_id"]
    assert db_session.query(MentorshipApplication).count() == 1

    changed = client.post(
        "/mentorship-applications",
        json={**payload, "goal": "هدف متفاوت"},
        headers=headers,
    )
    assert changed.status_code == 409
    assert db_session.query(MentorshipApplication).count() == 1


def test_idempotency_key_is_scoped_to_application_type(client, db_session, monkeypatch):
    headers = {**same_origin_headers(), "Idempotency-Key": "cross-type-request-00001"}
    mentorship = client.post(
        "/mentorship-applications",
        json={**valid_common_payload(), "level": "در حال مطالعه"},
        headers=headers,
    )
    monkeypatch.setitem(AUTHENTICATED_STUDENT, "field", "physics")
    tutoring = client.post(
        "/tutoring-applications",
        json={**valid_common_payload(), "topic": "مکانیک"},
        headers=headers,
    )
    assert mentorship.status_code == 201
    assert tutoring.status_code == 201
    assert db_session.query(MentorshipApplication).count() == 1
    assert db_session.query(TutoringApplication).count() == 1
