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
: "${AUTH_DB_MIGRATOR:?AUTH_DB_MIGRATOR must be set}"
: "${APP_DB_MIGRATOR:?APP_DB_MIGRATOR must be set}"
: "${PEOPLE_DB_MIGRATOR:?PEOPLE_DB_MIGRATOR must be set}"
: "${CONTENT_DB_MIGRATOR:?CONTENT_DB_MIGRATOR must be set}"
: "${AUTH_DB_USER:?AUTH_DB_USER must be set}"
: "${APP_DB_USER:?APP_DB_USER must be set}"
: "${PEOPLE_DB_USER:?PEOPLE_DB_USER must be set}"
: "${CONTENT_DB_USER:?CONTENT_DB_USER must be set}"
snapshot="${1:-}"
confirmation="${2:-}"
if [ -z "$snapshot" ] || [ "$confirmation" != "--confirm" ]; then echo "Usage: restore.sh /backups/<UTC-timestamp> --confirm" >&2; exit 2; fi
case "$snapshot" in /backups/20????????T??????Z) ;; *) echo "Snapshot path is not an allowed backup directory" >&2; exit 2;; esac
for file in auth.dump application.dump people.dump content.dump media.tar.gz SHA256SUMS; do if [ ! -s "$snapshot/$file" ]; then echo "Snapshot is incomplete: missing $file" >&2; exit 1; fi; done
(cd "$snapshot" && sha256sum -c SHA256SUMS)
echo "WARNING: this drops and recreates all four application databases and replaces the media volume."
echo "Stop all application writers and verify .env names/passwords before continuing."
pg_isready -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" >/dev/null
for service in auth application people content; do
  case "$service" in
    auth) db_name="$AUTH_DB_NAME"; owner="$AUTH_DB_MIGRATOR"; runtime="$AUTH_DB_USER"; dump="$snapshot/auth.dump" ;;
    application) db_name="$APP_DB_NAME"; owner="$APP_DB_MIGRATOR"; runtime="$APP_DB_USER"; dump="$snapshot/application.dump" ;;
    people) db_name="$PEOPLE_DB_NAME"; owner="$PEOPLE_DB_MIGRATOR"; runtime="$PEOPLE_DB_USER"; dump="$snapshot/people.dump" ;;
    content) db_name="$CONTENT_DB_NAME"; owner="$CONTENT_DB_MIGRATOR"; runtime="$CONTENT_DB_USER"; dump="$snapshot/content.dump" ;;
  esac
  echo "Restoring ${service} database..."
  dropdb --if-exists --force --username "$PGUSER" "$db_name"
  createdb --username "$PGUSER" --owner "$owner" "$db_name"
  pg_restore --exit-on-error --username "$PGUSER" --no-owner --role "$owner" --dbname "$db_name" "$dump"
  psql -X -v ON_ERROR_STOP=1 --username "$PGUSER" --dbname "$db_name" -c "REVOKE ALL PRIVILEGES ON DATABASE $db_name FROM PUBLIC"
  psql -X -v ON_ERROR_STOP=1 --username "$PGUSER" --dbname "$db_name" -c "GRANT CONNECT ON DATABASE $db_name TO $runtime"
  psql -X -v ON_ERROR_STOP=1 --username "$PGUSER" --dbname "$db_name" -c "GRANT USAGE ON SCHEMA public TO $runtime"
  psql -X -v ON_ERROR_STOP=1 --username "$PGUSER" --dbname "$db_name" -c "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO $runtime"
  psql -X -v ON_ERROR_STOP=1 --username "$PGUSER" --dbname "$db_name" -c "GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO $runtime"
done
mkdir -p /data/media
find /data/media -mindepth 1 -maxdepth 1 -exec rm -rf {} +
tar -xzf "$snapshot/media.tar.gz" -C /data
test -d /data/media
echo "Restore completed. Start application services and verify health."
