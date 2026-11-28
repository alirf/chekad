#!/bin/sh
set -eu
umask 077
: "${PGHOST:=postgres}"
: "${PGPORT:=5432}"
: "${PGUSER:?PGUSER must be set}"
: "${PGPASSWORD:?PGPASSWORD must be set}"
: "${AUTH_DB_NAME:?AUTH_DB_NAME must be set}"
: "${APP_DB_NAME:?APP_DB_NAME must be set}"
: "${PEOPLE_DB_NAME:?PEOPLE_DB_NAME must be set}"
: "${CONTENT_DB_NAME:?CONTENT_DB_NAME must be set}"
: "${BACKUP_RETENTION_DAYS:=30}"
case "$BACKUP_RETENTION_DAYS" in *[!0-9]*|"") echo "BACKUP_RETENTION_DAYS must be an integer" >&2; exit 2;; esac
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
work="/backups/.tmp-${timestamp}-$$"
target="/backups/${timestamp}"
mkdir -p /backups
if [ -e "$target" ]; then echo "Backup target already exists: $target" >&2; exit 1; fi
mkdir -m 700 "$work"
cleanup() { rm -rf "$work"; }
trap cleanup EXIT HUP INT TERM
until pg_isready -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" >/dev/null 2>&1; do sleep 2; done
for service in auth application people content; do
  case "$service" in auth) db_name="$AUTH_DB_NAME" ;; application) db_name="$APP_DB_NAME" ;; people) db_name="$PEOPLE_DB_NAME" ;; content) db_name="$CONTENT_DB_NAME" ;; esac
  echo "Exporting ${service} database..."
  pg_dump --format=custom --username "$PGUSER" --no-password --dbname "$db_name" > "$work/${service}.dump"
  test -s "$work/${service}.dump"
done
tar -czf "$work/media.tar.gz" -C /data media
test -s "$work/media.tar.gz"
(cd "$work" && sha256sum auth.dump application.dump people.dump content.dump media.tar.gz > SHA256SUMS)
mv "$work" "$target"
trap - EXIT HUP INT TERM
find /backups -mindepth 1 -maxdepth 1 -type d -name "20????????T??????Z" -mtime "+$BACKUP_RETENTION_DAYS" -exec rm -rf {} +
echo "Backup completed: $target"
