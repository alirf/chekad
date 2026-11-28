import bcrypt

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.config import settings
from app.db import SessionLocal
from app.main import app
from app.models import MentorUser, StudentUser
from app.security import MENTOR_COOKIE_NAME, STUDENT_COOKIE_NAME


def register_payload(**overrides):
    payload = {
        "first_name": "آرمان",
        "last_name": "محمدی",
        "phone": "۰۹۱۲۳۴۵۶۷۸۹",
        "guardian_phone": "09121112233",
        "grade": "دهم",
        "field": "physics",
        "password": "SecurePass!234",
        "guardian_consent": True,
        "privacy_accepted": True,
    }
    payload.update(overrides)
    return payload


def test_registration_normalizes_phone_hashes_password_and_sets_student_cookie():
    with TestClient(app) as client:
        response = client.post("/student/register", json=register_payload())

        assert response.status_code == 201
        assert response.json()["student"]["phone"] == "09123456789"
        assert response.json()["student"]["phone_verified"] is False
        assert STUDENT_COOKIE_NAME in response.cookies

        with SessionLocal() as db:
            student = db.query(StudentUser).filter_by(phone="09123456789").one()
            assert student.password_hash != "SecurePass!234"
            assert student.guardian_consent is True
            assert student.guardian_consent_at is not None
            assert student.privacy_accepted_at is not None


def test_registration_rejects_missing_guardian_consent():
    with TestClient(app) as client:
        response = client.post(
            "/student/register",
            json=register_payload(guardian_consent=False),
        )

    assert response.status_code == 422


def test_duplicate_student_phone_is_rejected():
    with TestClient(app) as client:
        first = client.post("/student/register", json=register_payload())
        second = client.post(
            "/student/register",
            json=register_payload(guardian_phone="09129998877"),
        )

    assert first.status_code == 201
    assert second.status_code == 409


def test_student_login_profile_services_logout_and_admin_separation():
    with TestClient(app) as client:
        registered = client.post("/student/register", json=register_payload())
        assert registered.status_code == 201

        client.post("/student/logout")
        wrong_password = client.post(
            "/student/login",
            json={"phone": "09123456789", "password": "WrongPassword!"},
        )
        assert wrong_password.status_code == 401

        login = client.post(
            "/student/login",
            json={"phone": "۰۹۱۲۳۴۵۶۷۸۹", "password": "SecurePass!234"},
        )
        assert login.status_code == 200

        me = client.get("/student/me")
        assert me.status_code == 200
        assert me.json()["first_name"] == "آرمان"
        assert me.json()["guardian_phone"] == "09121112233"

        services = client.get("/student/services")
        assert services.status_code == 200
        assert {item["key"] for item in services.json()} == {
            "mentorship", "tutoring", "exams", "articles"
        }

        # A student cookie must never authenticate the admin endpoint.
        admin_me = client.get("/me")
        assert admin_me.status_code == 401

        logout = client.post("/student/logout")
        assert logout.status_code == 200
        assert client.get("/student/me").status_code == 401


def test_registration_can_be_disabled_by_configuration(monkeypatch):
    monkeypatch.setattr(settings, "student_registration_enabled", False)
    with TestClient(app) as client:
        response = client.post("/student/register", json=register_payload())

    assert response.status_code == 503



def test_mentor_login_has_separate_cookie_audience_and_profile_identity():
    password = "MentorStrong!234"
    with SessionLocal() as db:
        mentor = MentorUser(
            mentor_profile_id=73,
            phone="09125554433",
            display_name="منتور آزمایشی",
            password_hash=bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8"),
            is_active=True,
        )
        db.add(mentor)
        db.commit()

    with TestClient(app) as client:
        wrong = client.post(
            "/mentor/login",
            json={"phone": "09125554433", "password": "WrongPassword!"},
        )
        assert wrong.status_code == 401

        login = client.post(
            "/mentor/login",
            json={"phone": "۰۹۱۲۵۵۵۴۴۳۳", "password": password},
        )
        assert login.status_code == 200
        assert MENTOR_COOKIE_NAME in login.cookies
        assert login.json()["mentor"]["mentor_profile_id"] == 73

        profile = client.get("/mentor/me")
        assert profile.status_code == 200
        assert profile.json()["display_name"] == "منتور آزمایشی"
        assert profile.json()["mentor_profile_id"] == 73

        # A mentor session is not an administrator or a student session.
        assert client.get("/me").status_code == 401
        assert client.get("/student/me").status_code == 401

        logout = client.post("/mentor/logout")
        assert logout.status_code == 200
        assert client.get("/mentor/me").status_code == 401


def test_inactive_mentor_cannot_authenticate():
    password = "MentorStrong!234"
    with SessionLocal() as db:
        db.add(MentorUser(
            mentor_profile_id=74,
            phone="09125554434",
            display_name="منتور غیرفعال",
            password_hash=bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8"),
            is_active=False,
        ))
        db.commit()

    with TestClient(app) as client:
        response = client.post(
            "/mentor/login",
            json={"phone": "09125554434", "password": password},
        )
        assert response.status_code == 401
