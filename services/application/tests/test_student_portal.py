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
from app.main import app, require_admin, require_student
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
