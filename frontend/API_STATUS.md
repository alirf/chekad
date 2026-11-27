# Application API and Privacy Readiness

This document describes the committed implementation. A database model is not an API unless a real route is present.

## Runtime stack and routing

- Next.js 14.2.5, React 18.3.1, TypeScript 5.5.4
- FastAPI application-service, SQLAlchemy 2.0.35 and Alembic
- Gateway route `/api/application/*` proxies to application-service.
- Frontend uses `NEXT_PUBLIC_API_BASE=/api`.

## Public application endpoints

### POST `/api/application/mentorship-applications`

Accepts:
- `first_name`, `last_name`
- `grade`: دهم، یازدهم، دوازدهم، فارغ‌التحصیل یا سایر
- `field`: `physics` or `computer`
- `guardian_phone`: Iranian mobile phone for parent/guardian
- `guardian_consent: true`
- `privacy_accepted: true`
- optional `level`, `goal`, `notes`

### POST `/api/application/tutoring-applications`

Accepts common fields above, plus required `topic` and optional `goal`, `notes`.

### Response

Both endpoints return HTTP 201 and a minimal response with request ID, `status: "received"` and a generic message. Student name, guardian phone, notes or other personal data are never echoed.

## Security and safe activation

- API intake is disabled by default.
- Activation requires all of:
  - `PUBLIC_APPLICATIONS_ENABLED=true`
  - a syntactically valid, monitored `PRIVACY_CONTACT_EMAIL`
  - a canonical `PUBLIC_SITE_ORIGIN` using HTTPS only, with no path/query/fragment.
- Browser submissions must provide an HTTPS `Origin` that exactly matches the configured canonical origin; path, query, fragment and user-info components are rejected.
- Frontend forms remain disabled until the same settings are valid; no personal information is accepted while disabled.
- Gateway limits application request bodies to 32 KB.
- Nginx limits the `/api/application/` route group to 5 requests/minute per source IP, burst 3, HTTP 429 on excess.
- Input uses Pydantic validation, strict literal consent booleans, rejected extra fields, bounded text lengths and normalized Iranian mobile numbers.
- Public forms do not request/store a student's own phone, email, national ID, address or Telegram ID; only parent/guardian phone is stored.
- Guardian-consent timestamp, separate privacy-acceptance timestamp and privacy-notice version `2026-11-27-v1` are stored per request.
- Legacy application rows keep NULL consent metadata; no historic consent is fabricated.
- Admin statistics delegate session validation to auth-service `GET /me`.

## Privacy notice

Version `2026-11-27-v1` is published at `/privacy`. It documents collected fields, purpose, access, guardian consent, Telegram as a third-party platform, retention, technical logs, correction/deletion requests and the need for legal review.

The operational contact email is read from `PRIVACY_CONTACT_EMAIL`. Do not enable intake until this address is real and monitored.

## Retention

- Default retention window: 365 days (`PURGE_APPLICATIONS_AFTER_DAYS`).
- Requests older than the retention window are purged unless they still have an active mentor/tutor assignment.
- Related application records, internal notes and dependent sessions are removed; the student row is removed only if no other request references it.
- Docker Compose starts `application-retention`, which performs one purge and then runs daily.
- Backups and host-level logs follow the operator's backup/log rotation policy and should be configured consistently with the notice.

Manual run:
```sh
docker compose exec application-service python -m app.purge_expired_applications
```

## Database migration

Migration `app_0002` makes the legacy student phone column nullable and adds nullable guardian-consent and privacy-version fields. Legacy rows stay NULL to preserve truthful consent history.

Take a database backup before applying migrations.

## Deployment configuration

Set the following values in the server's `.env` only after confirming the operational details:

```dotenv
PUBLIC_APPLICATIONS_ENABLED=true
PUBLIC_SITE_ORIGIN=https://your-real-domain.example
PRIVACY_CONTACT_EMAIL=an-address-you-monitor@your-real-domain.example
PURGE_APPLICATIONS_AFTER_DAYS=365
```

Replace both example addresses with the actual domain and actively monitored privacy contact. Keep intake disabled until that is done. Do not copy the example values verbatim.

## CI

GitHub Actions runs:
- frontend ESLint;
- TypeScript validation;
- Next.js production build;
- application-service tests for API persistence, consent, same-origin checks, private responses, admin protection and Alembic migrations.

A workflow file is not proof of success; inspect the resulting GitHub Actions run status.


## Framework and CI compatibility

- Next.js upgraded from unsupported 14.2.5 to 16.4.6 (Active LTS).
- React and React DOM upgraded to 19.3.1.
- Next 16 async request APIs are used for route params and admin cookies.
- ESLint uses the Next 16 flat configuration and the CLI script `eslint .`; the removed `next lint` command is no longer used.
- TypeScript remains on the existing 5.5 line; React type packages are pinned to compatible 19.2.x declarations.
- GitHub Actions exposes the application package to pytest through `PYTHONPATH` and invokes `python -m pytest`.


## Runtime baseline

- Docker and CI use Node.js 26 LTS.
- Frontend package engine requires Node.js >=26.
- CI uses current Node-compatible GitHub Actions majors (checkout/setup-node/setup-python v7).
- Node type declarations are aligned with the Node 26 runtime.
