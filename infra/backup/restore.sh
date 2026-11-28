#!/bin/sh
set -eu
umask 077

snapshot="${1:-}"
confirmation="${2:-}"
if [ -z "$snapshot" ] || [ "$confirmation" != "--confirm" ]; then
  echo "Usage: restore.sh /backups/<UTC-timestamp> --confirm" >&2
  exit 2
fi
case "$snapshot" in /backups/20????????T??????Z) ;; *) echo "Snapshot path is not an allowed backup directory" >&2; exit 2;; esac
if [ ! -d "$snapshot" ] || [ ! -s "$snapshot/cluster.sql" ] || [ ! -s "$snapshot/media.tar.gz" ] || [ ! -s "$snapshot/SHA256SUMS" ]; then
  echo "Snapshot is incomplete" >&2
  exit 1
fi

echo "Verifying backup checksums..."
(cd "$snapshot" && sha256sum -c SHA256SUMS)

echo "WARNING: This replaces the Chekad databases/roles in the PostgreSQL cluster and the media volume."
echo "Ensure all application services are stopped and a current safety backup exists."
pg_isready -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" >/dev/null

echo "Restoring PostgreSQL cluster..."
psql -X -v ON_ERROR_STOP=1 --username "$PGUSER" --dbname postgres --file "$snapshot/cluster.sql"

echo "Replacing media volume..."
rm -rf /data/media
mkdir -p /data
tar -xzf "$snapshot/media.tar.gz" -C /data
test -d /data/media

echo "Restore completed. Start application services and verify health."
