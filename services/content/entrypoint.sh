#!/bin/sh
set -e

echo "[entrypoint] Waiting for database..."
python - <<'PY'
import os, sys, time
from sqlalchemy import create_engine, text
url = os.environ["DB_URL"]
for i in range(30):
    try:
        e = create_engine(url)
        with e.connect() as c:
            c.execute(text("SELECT 1"))
        print("DB ready.")
        sys.exit(0)
    except Exception as ex:
        print(f"  attempt {i+1}/30: {ex.__class__.__name__}")
        time.sleep(2)
sys.exit(1)
PY

if ! ls alembic/versions/*.py >/dev/null 2>&1; then
    echo "[entrypoint] Generating initial migration..."
    alembic revision --autogenerate -m "initial"
fi

echo "[entrypoint] Applying migrations..."
alembic upgrade head

echo "[entrypoint] Seeding..."
python -m app.seed || echo "[entrypoint] Seed skipped or failed (continuing)."

echo "[entrypoint] Starting server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000