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


def test_admin_endpoints_require_authentication():
    response = client().get("/admin/articles")
    assert response.status_code == 401


def test_article_draft_is_hidden_until_published():
    app.dependency_overrides[require_admin] = admin
    c = client()
    payload = {
        "slug": "sample-article", "title": "Sample article",
        "excerpt": "Summary", "body": "Body", "category": "Physics",
        "tags": "physics,olympiad", "status": "draft",
    }
    created = c.post("/admin/articles", json=payload)
    assert created.status_code == 201
    assert created.json()["slug"] == "sample-article"
    assert c.get("/articles").json() == []

    payload["status"] = "published"
    updated = c.put(f"/admin/articles/{created.json()['id']}", json=payload)
    assert updated.status_code == 200
    public = c.get("/articles").json()
    assert len(public) == 1
    assert public[0]["title"] == "Sample article"


def test_exam_create_and_public_filter():
    app.dependency_overrides[require_admin] = admin
    c = client()
    payload = {
        "slug": "physics-stage-one", "title": "Physics stage one",
        "field": "physics", "stage": "Stage 1", "duration_minutes": 120,
        "status": "upcoming",
    }
    response = c.post("/admin/exams", json=payload)
    assert response.status_code == 201
    assert len(c.get("/exams?field=physics").json()) == 1
    assert c.get("/exams?field=computer").json() == []
