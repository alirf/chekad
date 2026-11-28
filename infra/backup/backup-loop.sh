#!/bin/sh
set -eu
: "${BACKUP_INTERVAL_SECONDS:=86400}"
case "$BACKUP_INTERVAL_SECONDS" in *[!0-9]*|'') echo "BACKUP_INTERVAL_SECONDS must be an integer" >&2; exit 2;; esac
if [ "$BACKUP_INTERVAL_SECONDS" -lt 3600 ]; then
  echo "BACKUP_INTERVAL_SECONDS must be at least 3600 seconds" >&2
  exit 2
fi
while :; do
  /bin/sh /scripts/backup-once.sh || echo "Backup failed at $(date -u +%FT%TZ)" >&2
  sleep "$BACKUP_INTERVAL_SECONDS"
done
