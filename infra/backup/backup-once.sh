#!/bin/sh
set -eu
umask 077

: "${PGHOST:=postgres}"
: "${PGPORT:=5432}"
: "${PGUSER:?PGUSER must be set}"
: "${PGPASSWORD:?PGPASSWORD must be set}"
: "${BACKUP_RETENTION_DAYS:=30}"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
work="/backups/.tmp-${timestamp}-$$"
target="/backups/${timestamp}"
mkdir -p /backups
if [ -e "$target" ]; then
  echo "Backup target already exists: $target" >&2
  exit 1
fi
mkdir -m 700 "$work"
cleanup() { rm -rf "$work"; }
trap cleanup EXIT HUP INT TERM

echo "Waiting for PostgreSQL..."
until pg_isready -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" >/dev/null 2>&1; do sleep 2; done

echo "Exporting PostgreSQL cluster..."
pg_dumpall --clean --if-exists --username "$PGUSER" --no-password > "$work/cluster.sql"
test -s "$work/cluster.sql"

echo "Archiving media volume..."
tar -czf "$work/media.tar.gz" -C /data media
test -s "$work/media.tar.gz"

(
  cd "$work"
  sha256sum cluster.sql media.tar.gz > SHA256SUMS
)
mv "$work" "$target"
trap - EXIT HUP INT TERM

# Keep recent snapshots. Off-site copies must have their own retention policy.
find /backups -mindepth 1 -maxdepth 1 -type d -name '20????????T??????Z' -mtime "+$BACKUP_RETENTION_DAYS" -exec rm -rf {} +

echo "Backup completed: $target"
