import os
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, time, timedelta, timezone
from threading import Barrier

os.environ.setdefault("DB_URL", "sqlite:///./application-test-default.db")
os.environ.setdefault("SERVICE_NAME", "application-service")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

import app.main as application_module
from app import models
from app.config import settings
from app.db import Base, SessionLocal, engine, get_db
from app.main import app, require_admin, require_student

pytestmark = pytest.mark.skipif(
    engine.dialect.name != "postgresql",
    reason="These integration tests require PostgreSQL row/advisory locks.",
)

STUDENT = {
    "id": 81001,
    "first_name": "آرمان",
    "last_name": "رضایی",
    "grade": "یازدهم",
    "field": "physics",
    "guardian_phone": "09123456789",
    "phone_verified": True,
    "guardian_consent": True,
}
ORIGIN_HEADERS = {"Origin": "https://testserver"}


@pytest.fixture(autouse=True)
def clear_postgres_tables():
    # The CI job runs Alembic before pytest. Truncate only; do not replace the
    # migrated schema with metadata.create_all(), so tests exercise real DDL.
    table_names = ", ".join(f'"{table.name}"' for table in Base.metadata.sorted_tables)
    with engine.begin() as connection:
        connection.execute(text(f"TRUNCATE TABLE {table_names} RESTART IDENTITY CASCADE"))
    yield


@pytest.fixture
def api_dependencies():
    original = app.dependency_overrides.copy()

    def override_get_db():
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[require_student] = lambda: STUDENT.copy()
    app.dependency_overrides[require_admin] = lambda: {"id": 77}
    yield

    app.dependency_overrides.clear()
    app.dependency_overrides.update(original)


@pytest.fixture
def public_intake_settings(monkeypatch):
    monkeypatch.setattr(settings, "public_applications_enabled", True)
    monkeypatch.setattr(settings, "terms_approved", True)
    monkeypatch.setattr(settings, "public_site_origin", "https://testserver")
    monkeypatch.setattr(settings, "privacy_contact_email", "privacy@example.test")
    monkeypatch.setattr(settings, "privacy_contact_phone", "")
    monkeypatch.setattr(settings, "privacy_contact_telegram", "")


def common_application_payload():
    return {
        "first_name": "آرمان",
        "last_name": "رضایی",
        "grade": "یازدهم",
        "field": "physics",
        "guardian_phone": "۰۹۱۲۳۴۵۶۷۸۹",
        "guardian_consent": True,
        "privacy_accepted": True,
        "level": "در حال مطالعه",
        "goal": "برنامه‌ریزی و پیگیری منظم مسیر المپیاد",
        "notes": "تمرکز روی حل مسئله و بررسی هفتگی پیشرفت",
    }


async def fake_mentor(kind: str, person_id: int):
    return {
        "id": person_id,
        "status": "active",
        "is_public": True,
        "field": "physics",
        "first_name": "مریم",
        "last_name": "قاسمی",
        "capacity": 10,
    }


def assignment_payload(application_id: int, person_id: int, sessions=None):
    start = date.today()
    return {
        "kind": "mentorship",
        "application_id": application_id,
        "person_id": person_id,
        "start_date": start.isoformat(),
        "end_date": (start + timedelta(days=30)).isoformat(),
        "sessions": sessions or [],
    }


def test_mentorship_end_to_end_from_student_request_to_active_sessions(
    api_dependencies, public_intake_settings, monkeypatch
):
    monkeypatch.setattr(application_module, "fetch_public_person", fake_mentor)
    planned_sessions = []
    start = date.today()
    for index in range(8):
        scheduled_day = start + timedelta(days=index * 3 + 1)
        scheduled_at = datetime.combine(
            scheduled_day, time(hour=17), tzinfo=timezone.utc
        )
        planned_sessions.append({
            "scheduled_at": scheduled_at.isoformat(),
            "duration_minutes": 20,
        })

    with TestClient(app) as client:
        submitted = client.post(
            "/mentorship-applications",
            json=common_application_payload(),
            headers=ORIGIN_HEADERS,
        )
        assert submitted.status_code == 201, submitted.text
        application_id = submitted.json()["request_id"]

        offered = client.post(
            f"/admin/applications/mentorship/{application_id}/offers",
            json={
                "person_id": 51001,
                "description": "همراهی هفتگی در برنامه‌ریزی و حل مسئله",
                "price_toman": 500000,
                "terms": "هشت جلسه بیست دقیقه‌ای طی یک ماه",
            },
            headers=ORIGIN_HEADERS,
        )
        assert offered.status_code == 201, offered.text
        offer_id = offered.json()["id"]

        student_offers = client.get("/student/application-offers")
        assert student_offers.status_code == 200
        assert any(item["id"] == offer_id for item in student_offers.json()["items"])

        selected = client.post(
            f"/student/application-offers/{offer_id}/select",
            headers=ORIGIN_HEADERS,
        )
        assert selected.status_code == 200, selected.text
        assert selected.json()["status"] == "accepted"

        assigned = client.post(
            "/admin/assignments",
            json=assignment_payload(application_id, 51001, planned_sessions),
            headers=ORIGIN_HEADERS,
        )
        assert assigned.status_code == 201, assigned.text
        assert assigned.json()["sessions_count"] == 8

        classes = client.get("/student/classes")
        assert classes.status_code == 200
        body = classes.json()
        assert body["total"] == 1
        assert body["items"][0]["kind"] == "mentorship"
        assert body["items"][0]["person_name"] == "مریم قاسمی"
        assert len(body["items"][0]["sessions"]) == 8
        assert [row["session_number"] for row in body["items"][0]["sessions"]] == list(range(1, 9))

    with SessionLocal() as db:
        application = db.get(models.MentorshipApplication, application_id)
        offer = db.get(models.ApplicationOffer, offer_id)
        assert application.status == "active"
        assert offer.status == "selected"
        assert db.query(models.MentorAssignment).filter_by(
            application_id=application_id, status="active"
        ).count() == 1


def test_postgres_serializes_two_concurrent_selections_for_one_application(
    api_dependencies, public_intake_settings
):
    with SessionLocal() as db:
        student = models.Student(
            auth_student_id=STUDENT["id"],
            first_name=STUDENT["first_name"],
            last_name=STUDENT["last_name"],
            grade=STUDENT["grade"],
            field=STUDENT["field"],
        )
        db.add(student)
        db.flush()
        application = models.MentorshipApplication(
            student_id=student.id,
            field="physics",
            status="options_proposed",
        )
        db.add(application)
        db.flush()
        offers = [
            models.ApplicationOffer(
                application_kind="mentorship",
                application_id=application.id,
                person_id=person_id,
                person_name=f"منتور {person_id}",
                field="physics",
                description="پیشنهاد همراهی در مسیر المپیاد",
                terms="هشت جلسه در یک ماه",
                status="proposed",
                created_by_admin_id=77,
            )
            for person_id in (52001, 52002)
        ]
        db.add_all(offers)
        db.commit()
        offer_ids = [offer.id for offer in offers]
        application_id = application.id

    barrier = Barrier(2)

    def select_offer(offer_id: int) -> int:
        with TestClient(app) as client:
            barrier.wait(timeout=10)
            response = client.post(
                f"/student/application-offers/{offer_id}/select",
                headers=ORIGIN_HEADERS,
            )
            return response.status_code

    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = [pool.submit(select_offer, offer_id) for offer_id in offer_ids]
        statuses = [future.result(timeout=30) for future in futures]

    assert sorted(statuses) == [200, 409]
    with SessionLocal() as db:
        application = db.get(models.MentorshipApplication, application_id)
        offers = db.query(models.ApplicationOffer).filter_by(
            application_kind="mentorship", application_id=application_id
        ).all()
        assert application.status == "accepted"
        assert sum(offer.status == "selected" for offer in offers) == 1
        assert sum(offer.status == "withdrawn" for offer in offers) == 1


def test_postgres_advisory_lock_prevents_mentor_capacity_oversubscription(
    api_dependencies, monkeypatch
):
    monkeypatch.setattr(application_module, "fetch_public_person", fake_mentor)
    # Both requests compete for the last slot of the same mentor.
    with SessionLocal() as db:
        application_ids = []
        for auth_id in (82001, 82002):
            student = models.Student(
                auth_student_id=auth_id,
                first_name="دانش‌آموز",
                last_name=str(auth_id),
                grade="یازدهم",
                field="physics",
            )
            db.add(student)
            db.flush()
            application = models.MentorshipApplication(
                student_id=student.id,
                field="physics",
                status="accepted",
            )
            db.add(application)
            db.flush()
            db.add(models.ApplicationOffer(
                application_kind="mentorship",
                application_id=application.id,
                person_id=53001,
                person_name="مریم قاسمی",
                field="physics",
                description="پیشنهاد همراهی در مسیر المپیاد",
                terms="هشت جلسه در یک ماه",
                status="selected",
                created_by_admin_id=77,
            ))
            application_ids.append(application.id)
        db.commit()

    barrier = Barrier(2)
    payloads = [assignment_payload(application_id, 53001) for application_id in application_ids]

    def assign(payload) -> int:
        with TestClient(app) as client:
            barrier.wait(timeout=10)
            response = client.post(
                "/admin/assignments",
                json=payload,
                headers=ORIGIN_HEADERS,
            )
            return response.status_code

    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = [pool.submit(assign, payload) for payload in payloads]
        statuses = [future.result(timeout=30) for future in futures]

    assert sorted(statuses) == [201, 409]
    with SessionLocal() as db:
        active = db.query(models.MentorAssignment).filter_by(
            mentor_id=53001, status="active"
        ).count()
        assert active == 1
