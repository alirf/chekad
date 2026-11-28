

## Mentor / tutor selection workflow

1. The student submits a mentorship or tutoring request from their authenticated account.
2. Operations reviews the request and sends one or more structured offers from the admin assignment area. Each offer stores the public mentor/tutor, description, optional price, terms, and optional expiry.
3. The student opens `/dashboard/requests`, compares the options, and explicitly selects one. The API locks the application, records the selected offer, closes the other offers, and changes the application status to `accepted`.
4. The assignment screen lists only accepted requests. The administrator must assign the exact person selected by the student; the backend rejects a different person or an offer that was not selected.
5. Capacity is rechecked under a per-provider PostgreSQL advisory lock, and assignment plus session records are committed together.

The in-app message thread remains available for questions and coordination, but it is no longer the source of truth for the student’s selection.
## PostgreSQL and media backups

The optional `backup` Compose profile creates a compressed snapshot immediately when started, then repeats it every `BACKUP_INTERVAL_SECONDS` (default: 24 hours). Each snapshot contains:

- Four independent PostgreSQL custom-format dumps (auth, application, people, and content databases). Role names/passwords are provisioned from the deployment `.env` and `infra/postgres/init-databases.sh`.
- The `chekad_media` volume archive.
- SHA-256 checksums for both files.

Snapshots are written under `./backups/<UTC timestamp>/`. The directory is excluded from Git and should be placed on a disk with restricted access. Database dumps contain sensitive account and application data; copy them to encrypted off-site storage for disaster recovery.

Start scheduled backups:

```sh
docker compose --profile backup up -d backup
```

Run a one-time backup (without leaving the scheduler running):

```sh
docker compose --profile backup run --rm --entrypoint /bin/sh backup /scripts/backup-once.sh
```

### Restore

1. Stop application writers while keeping PostgreSQL running:

```sh
docker compose stop gateway frontend auth-service application-service people-service content-service application-retention
```

2. Verify and restore a snapshot. Replace the timestamp with an existing directory name:

```sh
docker compose --profile backup run --rm --entrypoint /bin/sh backup /scripts/restore.sh /backups/<UTC-timestamp> --confirm
```

3. Start the application again:

```sh
docker compose up -d
```

Restore drops and recreates the four service databases using the migrator roles configured in `.env`, restores their contents, and reapplies runtime grants. It does not store role passwords: keep `.env` and its secrets in a separate encrypted secret store. The media volume is replaced. This is destructive: use `--confirm` only after checking the snapshot and ensuring a current backup exists. Do not run restore while application services are writing. The restore script verifies SHA-256 checksums before changing data.

### Recovery checks

At least monthly, restore the latest snapshot into an isolated test environment, run database migrations/health checks, and verify representative media files. A successful backup command alone is not proof of recoverability. Keep at least one encrypted copy outside the server; the local `./backups` directory does not protect against host or disk loss.
