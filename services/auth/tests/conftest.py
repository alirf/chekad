import os

# Isolated test configuration must be set before importing the application.
os.environ["DB_URL"] = "sqlite:///./auth-test.db"
os.environ["JWT_SECRET"] = "test-only-student-auth-secret-with-more-than-32-bytes"
os.environ["JWT_EXPIRE_MINUTES"] = "30"
os.environ["JWT_ISSUER"] = "chekad-auth-tests"
os.environ["JWT_AUDIENCE"] = "chekad-admin"
os.environ["AUTH_COOKIE_SECURE"] = "false"
os.environ["APP_ENV"] = "test"
os.environ["STUDENT_REGISTRATION_ENABLED"] = "true"

import pytest

from app.db import Base, engine
from app import models  # noqa: F401


@pytest.fixture(autouse=True)
def clean_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
