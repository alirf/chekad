"""Automatic admin seeding is intentionally disabled.

Create or rotate an administrator explicitly with:
    docker compose exec auth-service python -m app.bootstrap_admin
"""


def seed() -> None:
    raise SystemExit(
        "Automatic admin seed is disabled. Run `python -m app.bootstrap_admin` explicitly."
    )


if __name__ == "__main__":
    seed()
