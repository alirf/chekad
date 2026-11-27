import os
os.environ.setdefault("DB_URL", "sqlite://")

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import Base, get_db
from app.main import app, require_admin

engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def setup_function():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    app.dependency_overrides.clear()


def teardown_function():
    app.dependency_overrides.clear()


def override_db():
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()


def admin():
    return {"id": 1}


def client():
    app.dependency_overrides[get_db] = override_db
    return TestClient(app)


def test_admin_profile_api_requires_authentication():
    assert client().get("/admin/mentors").status_code == 401


def test_create_and_publish_mentor_profile_with_image():
    app.dependency_overrides[require_admin] = admin
    c = client()
    payload = {
        "first_name": "Test", "last_name": "Mentor", "field": "physics",
        "bio": "Profile biography", "achievements": "Verified award",
        "image_url": "https://example.com/mentor.jpg", "medals": "Gold",
        "education": "University", "specialties": "Mechanics",
        "experience": "Olympiad mentoring", "is_public": True,
    }
    response = c.post("/admin/mentors", json=payload)
    assert response.status_code == 201
    public = c.get("/mentors?field=physics").json()
    assert len(public) == 1
    assert public[0]["image_url"] == payload["image_url"]
    assert public[0]["medals"] == "Gold"


def test_reject_insecure_profile_image_url():
    app.dependency_overrides[require_admin] = admin
    payload = {"first_name": "Test", "last_name": "Mentor", "field": "computer", "image_url": "http://example.com/a.jpg"}
    assert client().post("/admin/mentors", json=payload).status_code == 422
