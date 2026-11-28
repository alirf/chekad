import os

os.environ.setdefault("DB_URL", "sqlite:///./application-portal-test-default.db")
os.environ.setdefault("SERVICE_NAME", "application-service")

from datetime import date, datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import Base, get_db
from app.main import app, require_admin, require_mentor, require_student
from app.config import settings


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
CURRENT_STUDENT = {
    "id": 41,
    "first_name": "آرمان",
    "last_name": "رضایی",
    "grade": "یازدهم",
    "field": "physics",
    "guardian_phone": "09123456789",
}


@pytest.fixture()
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture()
def client():
    Base.metadata.create_all(bind=TEST_ENGINE)
    original_origin = settings.public_site_origin
    settings.public_site_origin = "https://testserver"

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[require_student] = lambda: CURRENT_STUDENT.copy()
    app.dependency_overrides[require_admin] = lambda: {"id": 7, "name": "مدیر آزمون"}
    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()
    settings.public_site_origin = original_origin
    Base.metadata.drop_all(bind=TEST_ENGINE)
    CURRENT_STUDENT.update({
        "id": 41,
        "first_name": "آرمان",
        "last_name": "رضایی",
        "grade": "یازدهم",
        "field": "physics",
        "guardian_phone": "09123456789",
    })


def origin_headers():
    return {"Origin": "http://testserver"}


def test_student_support_thread_and_admin_reply_are_persisted_and_read(client):
    created = client.post(
        "/student/messages/threads",
        json={"subject": "پرسش درباره منتورینگ"},
        headers=origin_headers(),
    )
    assert created.status_code == 201
    thread_id = created.json()["id"]

    sent = client.post(
        f"/student/messages/threads/{thread_id}/messages",
        json={"body": "برای انتخاب منتور چه مراحلی وجود دارد؟"},
        headers=origin_headers(),
    )
    assert sent.status_code == 201
    assert sent.json()["sender_type"] == "student"

    inbox = client.get("/admin/messages/threads?status=open")
    assert inbox.status_code == 200
    assert inbox.json()["items"][0]["unread_count"] == 1

    reply = client.post(
        f"/admin/messages/threads/{thread_id}/messages",
        json={"body": "درخواستت بررسی می‌شود و گزینه‌های مناسب معرفی خواهند شد."},
        headers=origin_headers(),
    )
    assert reply.status_code == 201
    assert reply.json()["sender_type"] == "admin"

    messages = client.get(f"/student/messages/threads/{thread_id}/messages")
    assert messages.status_code == 200
    assert len(messages.json()["items"]) == 2
    assert messages.json()["items"][1]["read_at"] is not None

    listed = client.get("/student/messages/threads")
    assert listed.status_code == 200
    assert listed.json()["items"][0]["unread_count"] == 0


def test_student_cannot_read_or_send_to_another_students_thread(client):
    created = client.post(
        "/student/messages/threads",
        json={"subject": "گفت‌وگو"},
        headers=origin_headers(),
    )
    thread_id = created.json()["id"]

    CURRENT_STUDENT["id"] = 99
    hidden = client.get(f"/student/messages/threads/{thread_id}/messages")
    assert hidden.status_code == 404

    forbidden_send = client.post(
        f"/student/messages/threads/{thread_id}/messages",
        json={"body": "این پیام نباید ارسال شود"},
        headers=origin_headers(),
    )
    assert forbidden_send.status_code == 404


def test_student_can_create_and_retrieve_only_own_study_reports(client):
    created = client.post(
        "/student/reports",
        json={
            "report_date": "2026-11-28",
            "study_minutes": 125,
            "topics": "مکانیک و گراف",
            "summary": "مرور فصل و حل چند تمرین",
            "blockers": "در یک مسئله ترکیبیاتی مشکل داشتم.",
            "next_step": "مرور راه‌حل و حل تمرین مشابه",
        },
        headers=origin_headers(),
    )
    assert created.status_code == 201
    assert created.json()["id"] > 0

    result = client.get("/student/reports")
    assert result.status_code == 200
    assert result.json()["total"] == 1
    assert result.json()["items"][0]["study_minutes"] == 125

    CURRENT_STUDENT["id"] = 99
    other = client.get("/student/reports")
    assert other.status_code == 200
    assert other.json()["total"] == 0


def test_weekly_plan_tasks_are_owned_editable_and_appear_in_calendar(client):
    created = client.post(
        "/student/study-tasks",
        json={
            "title": "حل تمرین‌های الگوریتم",
            "description": "گراف و کوتاه‌ترین مسیر",
            "planned_at": "2026-11-29T15:30:00+01:00",
            "duration_minutes": 90,
        },
        headers=origin_headers(),
    )
    assert created.status_code == 201
    task_id = created.json()["id"]

    updated = client.patch(
        f"/student/study-tasks/{task_id}",
        json={"status": "completed"},
        headers=origin_headers(),
    )
    assert updated.status_code == 200
    assert updated.json()["status"] == "completed"

    calendar = client.get("/student/schedule")
    assert calendar.status_code == 200
    assert calendar.json()["total"] == 1
    assert calendar.json()["items"][0]["category"] == "study"

    CURRENT_STUDENT["id"] = 99
    hidden = client.patch(
        f"/student/study-tasks/{task_id}",
        json={"status": "pending"},
        headers=origin_headers(),
    )
    assert hidden.status_code == 404
    assert client.get("/student/study-tasks").json()["total"] == 0



def test_admin_assignment_creates_sessions_and_restricted_advisor_chat(client, db_session, monkeypatch):
    from app import main as application_main
    from app.models import MentorshipApplication, MentorAssignment, Student

    app.dependency_overrides[require_admin] = lambda: {"id": 7, "name": "مدیر"}
    app.dependency_overrides[require_mentor] = lambda: {
        "id": 73,
        "mentor_profile_id": 12,
        "display_name": "منتور فیزیک",
    }

    async def fake_people_profile(kind: str, person_id: int):
        assert kind == "mentorship"
        assert person_id == 12
        return {
            "id": 12,
            "first_name": "منتور",
            "last_name": "فیزیک",
            "field": "physics",
            "status": "active",
            "is_public": True,
            "capacity": 3,
            "current_load": 0,
        }

    monkeypatch.setattr(application_main, "fetch_public_person", fake_people_profile)

    student_profile = Student(
        auth_student_id=AUTHENTICATED_STUDENT["id"],
        first_name="آرمان",
        last_name="رضایی",
        grade="یازدهم",
        field="physics",
        parent_phone="+989123456789",
    )
    db_session.add(student_profile)
    db_session.flush()
    application = MentorshipApplication(
        student_id=student_profile.id,
        field="physics",
        status="reviewing",
        student_note="برنامه‌ریزی و پیگیری",
    )
    db_session.add(application)
    db_session.commit()
    application_id = application.id

    assigned = client.post(
        "/admin/assignments",
        headers={"Origin": "https://testserver"},
        json={
            "kind": "mentorship",
            "application_id": application_id,
            "person_id": 12,
            "start_date": "2026-11-28",
            "end_date": "2026-12-28",
            "sessions": [
                {"scheduled_at": "2026-11-30T16:00:00+01:00", "duration_minutes": 20},
                {"scheduled_at": "2026-12-03T16:00:00+01:00", "duration_minutes": 20},
            ],
        },
    )
    assert assigned.status_code == 201
    assignment_id = assigned.json()["id"]
    assert assigned.json()["sessions_count"] == 2

    classes = client.get("/student/classes")
    assert classes.status_code == 200
    assert classes.json()["total"] == 1
    assert classes.json()["items"][0]["kind"] == "mentorship"
    assert classes.json()["items"][0]["person_name"] == "منتور فیزیک"
    assert len(classes.json()["items"][0]["sessions"]) == 2

    study_report = client.post(
        "/student/reports",
        headers={"Origin": "http://testserver"},
        json={
            "report_date": "2026-11-28",
            "study_minutes": 100,
            "topics": "مکانیک",
            "summary": "مرور حرکت‌شناسی و حل تمرین",
        },
    )
    assert study_report.status_code == 201
    mentor_reports = client.get(f"/mentor/assignments/{assignment_id}/study-reports")
    assert mentor_reports.status_code == 200
    assert mentor_reports.json()["total"] == 1

    weekly_report = client.post(
        f"/mentor/assignments/{assignment_id}/weekly-reports",
        headers={"Origin": "http://testserver"},
        json={"week_number": 1, "content": "پیشرفت خوبی در مباحث پایه داشته‌ای و باید تمرین‌های بیشتری حل کنی."},
    )
    assert weekly_report.status_code == 201
    repeated_weekly_report = client.post(
        f"/mentor/assignments/{assignment_id}/weekly-reports",
        headers={"Origin": "http://testserver"},
        json={"week_number": 1, "content": "گزارش تکراری این هفته"},
    )
    assert repeated_weekly_report.status_code == 409
    visible_mentor_report = client.get("/student/mentor-reports")
    assert visible_mentor_report.status_code == 200
    assert visible_mentor_report.json()["total"] == 1
    assert visible_mentor_report.json()["items"][0]["week_number"] == 1

    advisor_thread = client.post(
        "/student/messages/advisor",
        headers={"Origin": "http://testserver"},
    )
    assert advisor_thread.status_code == 201
    thread_id = advisor_thread.json()["id"]
    assert advisor_thread.json()["advisor_assignment_id"] == assignment_id

    student_message = client.post(
        f"/student/messages/threads/{thread_id}/messages",
        headers={"Origin": "http://testserver"},
        json={"body": "برای جلسه اول چه تمرینی آماده کنم؟"},
    )
    assert student_message.status_code == 201

    mentor_threads = client.get("/mentor/messages/threads")
    assert mentor_threads.status_code == 200
    assert mentor_threads.json()["total"] == 1
    assert mentor_threads.json()["items"][0]["student_name"] == "آرمان رضایی"
    assert client.get(f"/mentor/assignments/{assignment_id}/study-reports").status_code == 200

    app.dependency_overrides[require_mentor] = lambda: {
        "id": 74,
        "mentor_profile_id": 999,
        "display_name": "منتور دیگر",
    }
    assert client.get(f"/mentor/assignments/{assignment_id}/study-reports").status_code == 404
    app.dependency_overrides[require_mentor] = lambda: {
        "id": 73,
        "mentor_profile_id": 12,
        "display_name": "منتور فیزیک",
    }

    mentor_reply = client.post(
        f"/mentor/messages/threads/{thread_id}/messages",
        headers={"Origin": "http://testserver"},
        json={"body": "لطفاً فصل اول مکانیک را مرور کن."},
    )
    assert mentor_reply.status_code == 201
    assert mentor_reply.json()["sender_type"] == "mentor"

    student_messages = client.get(f"/student/messages/threads/{thread_id}/messages")
    assert student_messages.status_code == 200
    assert len(student_messages.json()["items"]) == 2
    assert student_messages.json()["items"][1]["sender_type"] == "mentor"
    assert student_messages.json()["items"][1]["read_at"] is not None

    # A different mentor profile cannot list or open this assignment's messages.
    app.dependency_overrides[require_mentor] = lambda: {
        "id": 74,
        "mentor_profile_id": 999,
        "display_name": "منتور دیگر",
    }
    assert client.get("/mentor/messages/threads").json()["total"] == 0
    assert client.get(f"/mentor/messages/threads/{thread_id}/messages").status_code == 404

    # Keep an explicit reference to ensure the assignment persisted.
    assert db_session.get(MentorAssignment, assignment_id).mentor_id == 12


def test_admin_invoice_creation_payment_and_student_isolation(client, db_session):
    from app.models import Student, StudentInvoice

    app.dependency_overrides[require_admin] = lambda: {"id": 7, "name": "مدیر"}
    student_profile = Student(
        auth_student_id=AUTHENTICATED_STUDENT["id"],
        first_name="آرمان",
        last_name="رضایی",
        grade="یازدهم",
        field="physics",
        parent_phone="+989123456789",
    )
    db_session.add(student_profile)
    db_session.commit()

    created = client.post(
        "/admin/invoices",
        headers={"Origin": "https://testserver"},
        json={
            "student_auth_id": AUTHENTICATED_STUDENT["id"],
            "service_type": "other",
            "title": "هزینه خدمات آموزشی",
            "description": "صورتحساب آزمایشی",
            "amount_toman": 1250000,
            "due_date": "2026-12-10",
            "payment_instructions": "پس از پرداخت، رسید را برای پشتیبانی ارسال کن.",
        },
    )
    assert created.status_code == 201
    invoice_id = created.json()["id"]
    assert created.json()["invoice_number"].startswith("CH-INV-")

    own = client.get("/student/invoices")
    assert own.status_code == 200
    assert own.json()["total"] == 1
    assert own.json()["items"][0]["amount_toman"] == 1250000
    assert "payment_reference" not in own.json()["items"][0]

    paid = client.patch(
        f"/admin/invoices/{invoice_id}",
        headers={"Origin": "https://testserver"},
        json={"status": "paid", "payment_reference": "MANUAL-RECEIPT-001"},
    )
    assert paid.status_code == 200
    assert paid.json()["status"] == "paid"
    assert paid.json()["payment_reference"] == "MANUAL-RECEIPT-001"

    other_student = {"id": 99, **{k: v for k, v in AUTHENTICATED_STUDENT.items() if k != "id"}}
    app.dependency_overrides[require_student] = lambda: other_student
    isolated = client.get("/student/invoices")
    assert isolated.status_code == 200
    assert isolated.json()["total"] == 0

    stored = db_session.get(StudentInvoice, invoice_id)
    assert stored.status == "paid"
    assert stored.paid_at is not None
