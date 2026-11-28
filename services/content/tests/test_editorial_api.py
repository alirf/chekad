import os
os.environ.setdefault("DB_URL", "sqlite://")

from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import Base, get_db
from app.main import app, require_admin, require_student

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


def test_health_readiness_fails_when_database_is_unavailable(monkeypatch):
    def unavailable():
        raise OSError("database unavailable")

    monkeypatch.setattr("app.main.engine.connect", unavailable)
    c = client()
    assert c.get("/health/live").status_code == 200
    assert c.get("/health/ready").status_code == 503
    assert c.get("/health").status_code == 503


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



def test_student_can_register_cancel_and_re_register_for_matching_exam():
    app.dependency_overrides[require_admin] = admin
    app.dependency_overrides[require_student] = lambda: {
        "id": 41,
        "field": "physics",
        "first_name": "آرمان",
        "last_name": "رضایی",
    }
    c = client()
    created = c.post(
        "/admin/exams",
        json={
            "slug": "physics-qualifier-2027",
            "title": "آزمون انتخابی فیزیک",
            "field": "physics",
            "stage": "مرحله آزمایشی",
            "starts_at": "2027-01-15T10:00:00+03:30",
            "duration_minutes": 120,
            "status": "upcoming",
        },
    )
    assert created.status_code == 201
    exam_id = created.json()["id"]

    listing = c.get("/student/exams")
    assert listing.status_code == 200
    assert listing.json()["total"] == 1
    assert listing.json()["items"][0]["can_register"] is True
    assert listing.json()["items"][0]["is_registered"] is False

    registered = c.post(
        f"/student/exams/{exam_id}/register",
        headers={"Origin": "http://testserver"},
    )
    assert registered.status_code == 201
    assert registered.json()["status"] == "registered"

    duplicate = c.post(
        f"/student/exams/{exam_id}/register",
        headers={"Origin": "http://testserver"},
    )
    assert duplicate.status_code == 200

    assert c.get("/student/exams").json()["items"][0]["is_registered"] is True

    cancelled = c.delete(
        f"/student/exams/{exam_id}/register",
        headers={"Origin": "http://testserver"},
    )
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "cancelled"

    registered_again = c.post(
        f"/student/exams/{exam_id}/register",
        headers={"Origin": "http://testserver"},
    )
    assert registered_again.status_code == 201
    assert c.get("/student/exams").json()["items"][0]["is_registered"] is True

    admin_list = c.get("/admin/exam-registrations?status=registered")
    assert admin_list.status_code == 200
    assert admin_list.json()["total"] == 1
    assert admin_list.json()["items"][0]["student_auth_id"] == 41


def test_student_cannot_register_for_another_field_or_closed_exam():
    app.dependency_overrides[require_admin] = admin
    app.dependency_overrides[require_student] = lambda: {"id": 41, "field": "physics"}
    c = client()

    computer = c.post(
        "/admin/exams",
        json={"slug": "computer-contest", "title": "Computer Contest", "field": "computer", "status": "upcoming"},
    ).json()
    closed = c.post(
        "/admin/exams",
        json={"slug": "closed-physics", "title": "Closed Physics", "field": "physics", "status": "closed"},
    ).json()

    wrong_field = c.post(
        f"/student/exams/{computer['id']}/register",
        headers={"Origin": "http://testserver"},
    )
    assert wrong_field.status_code == 403

    closed_response = c.post(
        f"/student/exams/{closed['id']}/register",
        headers={"Origin": "http://testserver"},
    )
    assert closed_response.status_code == 409


def test_student_exam_registration_requires_authentication_and_same_origin():
    c = client()
    assert c.get("/student/exams").status_code == 401

    app.dependency_overrides[require_student] = lambda: {"id": 41, "field": "physics"}
    app.dependency_overrides[require_admin] = admin
    exam = c.post(
        "/admin/exams",
        json={"slug": "origin-test", "title": "Origin test", "field": "physics", "status": "upcoming"},
    ).json()
    forbidden = c.post(f"/student/exams/{exam['id']}/register")
    assert forbidden.status_code == 403



def test_online_exam_auto_and_manual_grading_only_reveal_released_results():
    app.dependency_overrides[require_admin] = admin
    app.dependency_overrides[require_student] = lambda: {
        "id": 41,
        "field": "physics",
        "first_name": "آرمان",
        "last_name": "رضایی",
    }
    c = client()
    start = datetime.now(timezone.utc) - timedelta(minutes=5)
    created = c.post(
        "/admin/exams",
        json={
            "slug": "online-physics-exam",
            "title": "آزمون آنلاین فیزیک",
            "field": "physics",
            "stage": "آزمایشی",
            "starts_at": start.isoformat(),
            "duration_minutes": 60,
            "status": "upcoming",
        },
    )
    assert created.status_code == 201
    exam_id = created.json()["id"]

    choice = c.post(
        f"/admin/exams/{exam_id}/questions",
        headers={"Origin": "http://testserver"},
        json={
            "position": 1,
            "question_type": "single_choice",
            "prompt": "کدام گزینه قانون دوم نیوتن را بیان می‌کند؟",
            "options": ["F=ma", "E=mc2", "V=IR"],
            "correct_answer": "F=ma",
            "points": 2,
        },
    )
    assert choice.status_code == 201
    written = c.post(
        f"/admin/exams/{exam_id}/questions",
        headers={"Origin": "http://testserver"},
        json={
            "position": 2,
            "question_type": "written",
            "prompt": "قانون دوم نیوتن را با بیان خود توضیح بده.",
            "points": 3,
        },
    )
    assert written.status_code == 201

    registered = c.post(
        f"/student/exams/{exam_id}/register",
        headers={"Origin": "http://testserver"},
    )
    assert registered.status_code == 201

    started = c.post(
        f"/student/exams/{exam_id}/attempt/start",
        headers={"Origin": "http://testserver"},
    )
    assert started.status_code == 201
    attempt = c.get(f"/student/exams/{exam_id}/attempt")
    assert attempt.status_code == 200
    assert len(attempt.json()["questions"]) == 2
    assert "correct_answer" not in attempt.json()["questions"][0]

    saved = c.put(
        f"/student/exams/{exam_id}/attempt/answers",
        headers={"Origin": "http://testserver"},
        json={"answers": [
            {"question_id": choice.json()["id"], "answer_text": "F=ma"},
            {"question_id": written.json()["id"], "answer_text": "شتاب با نیروی خالص نسبت مستقیم دارد."},
        ]},
    )
    assert saved.status_code == 200

    submitted = c.post(
        f"/student/exams/{exam_id}/attempt/submit",
        headers={"Origin": "http://testserver"},
    )
    assert submitted.status_code == 200
    assert submitted.json()["status"] == "submitted"
    hidden = c.get(f"/student/exams/{exam_id}/result")
    assert hidden.status_code == 409

    admin_attempts = c.get(f"/admin/exams/{exam_id}/attempts")
    assert admin_attempts.status_code == 200
    attempt_row = admin_attempts.json()["items"][0]
    assert attempt_row["earned_score"] == 2
    written_answer = next(row for row in attempt_row["answers"] if row["question_type"] == "written")
    graded = c.patch(
        f"/admin/exams/{exam_id}/attempts/{attempt_row['id']}/answers/{written_answer['id']}",
        headers={"Origin": "http://testserver"},
        json={"earned_points": 2, "grader_note": "توضیح درست بود؛ یک نکته تکمیلی لازم داشت."},
    )
    assert graded.status_code == 200
    assert graded.json()["attempt_status"] == "graded"

    published = c.patch(
        f"/admin/exams/{exam_id}/results",
        headers={"Origin": "http://testserver"},
        json={"results_published": True},
    )
    assert published.status_code == 200
    result = c.get(f"/student/exams/{exam_id}/result")
    assert result.status_code == 200
    assert result.json()["earned_score"] == 4
    assert result.json()["max_score"] == 5
    assert result.json()["percentage"] == 80
    assert result.json()["answers"][0]["correct_answer"] == "F=ma"
    assert result.json()["answers"][1]["grader_note"] == "توضیح درست بود؛ یک نکته تکمیلی لازم داشت."


def test_online_exam_rejects_unregistered_students_and_wrong_field():
    app.dependency_overrides[require_admin] = admin
    app.dependency_overrides[require_student] = lambda: {"id": 41, "field": "physics"}
    c = client()
    start = datetime.now(timezone.utc) - timedelta(minutes=2)
    exam = c.post(
        "/admin/exams",
        json={
            "slug": "registered-only-online",
            "title": "آزمون آنلاین",
            "field": "physics",
            "starts_at": start.isoformat(),
            "duration_minutes": 30,
            "status": "upcoming",
        },
    ).json()
    assert c.post(
        f"/student/exams/{exam['id']}/attempt/start",
        headers={"Origin": "http://testserver"},
    ).status_code == 403
