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



def test_page_sections_and_layout_round_trip():
    app.dependency_overrides[require_admin] = admin
    c = client()
    payload = {
        "slug": "about-chekad", "title": "About", "description": "About page",
        "layout": "wide", "seo_title": "About us",
        "seo_description": "About description",
        "sections": [
            {"type": "heading", "title": "Our mission", "body": "Make olympiad learning accessible"},
            {"type": "features", "title": "What we do", "items": ["Physics", "Computer"]},
        ],
        "status": "published",
    }
    created = c.post("/admin/pages", json=payload)
    assert created.status_code == 201
    public = c.get("/pages/about-chekad")
    assert public.status_code == 200
    assert public.json()["layout"] == "wide"
    assert public.json()["sections"][1]["items"] == ["Physics", "Computer"]


def test_page_rejects_unsafe_section_image():
    app.dependency_overrides[require_admin] = admin
    payload = {
        "slug": "unsafe-image", "title": "Unsafe",
        "sections": [{"type": "image", "image_url": "javascript:alert(1)"}],
    }
    assert client().post("/admin/pages", json=payload).status_code == 422


def test_admin_can_delete_exam():
    app.dependency_overrides[require_admin] = admin
    c = client()
    payload = {"slug": "delete-me", "title": "Delete me", "field": "computer"}
    created = c.post("/admin/exams", json=payload)
    assert created.status_code == 201
    response = c.delete("/admin/exams/" + str(created.json()["id"]))
    assert response.status_code == 200
    assert c.get("/exams").json() == []



def test_authenticated_png_upload_is_saved_and_publicly_readable(tmp_path, monkeypatch):
    import app.main as content_main
    monkeypatch.setattr(content_main, "MEDIA_DIR", tmp_path)
    app.dependency_overrides[require_admin] = admin
    c = client()
    # A PNG signature is sufficient for the upload's content-type gate.
    png = bytes.fromhex("89504e470d0a1a0a") + b"test-image-payload"
    response = c.post(
        "/admin/media",
        files={"file": ("cover.png", png, "image/png")},
    )
    assert response.status_code == 201
    url = response.json()["url"]
    assert url.startswith("/api/content/media/")
    filename = url.rsplit("/", 1)[-1]
    stored = c.get("/media/" + filename)
    assert stored.status_code == 200
    assert stored.content == png


def test_media_upload_rejects_non_image_files():
    app.dependency_overrides[require_admin] = admin
    response = client().post(
        "/admin/media",
        files={"file": ("not-image.txt", b"plain text", "text/plain")},
    )
    assert response.status_code == 415
