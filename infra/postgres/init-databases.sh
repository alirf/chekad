#!/bin/sh
set -eu

: "${POSTGRES_USER:?POSTGRES_USER is required}"
: "${POSTGRES_DB:=postgres}"

ensure_role() {
  role_name="$1"
  role_password="$2"

  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
    --set=role_name="$role_name" --set=role_password="$role_password" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'role_name', :'role_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'role_name')
\gexec
SELECT format('ALTER ROLE %I WITH LOGIN PASSWORD %L', :'role_name', :'role_password')
\gexec
SQL
}

# PostgreSQL grants CONNECT to PUBLIC on maintenance databases by default.
# Remove that ambient access so service roles can connect only to their own DB.
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<'SQL'
SELECT format('REVOKE CONNECT ON DATABASE %I FROM PUBLIC', current_database())
\gexec
SELECT format('REVOKE CONNECT ON DATABASE %I FROM PUBLIC', 'template1')
WHERE EXISTS (SELECT 1 FROM pg_database WHERE datname = 'template1')
\gexec
SQL

ensure_database() {
  db_name="$1"
  owner_role="$2"
  runtime_role="$3"

  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
    --set=db_name="$db_name" --set=owner_role="$owner_role" \
    --set=runtime_role="$runtime_role" <<'SQL'
SELECT format('CREATE DATABASE %I OWNER %I', :'db_name', :'owner_role')
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'db_name')
\gexec
SELECT format('ALTER DATABASE %I OWNER TO %I', :'db_name', :'owner_role')
\gexec
SELECT format('REVOKE ALL PRIVILEGES ON DATABASE %I FROM PUBLIC', :'db_name')
\gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO %I', :'db_name', :'owner_role')
\gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO %I', :'db_name', :'runtime_role')
\gexec
SQL

  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$db_name" \
    --set=owner_role="$owner_role" --set=runtime_role="$runtime_role" <<'SQL'
SELECT format('ALTER SCHEMA public OWNER TO %I', :'owner_role')
\gexec
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
SELECT format('GRANT USAGE ON SCHEMA public TO %I', :'runtime_role')
\gexec
SELECT format('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO %I', :'runtime_role')
\gexec
SELECT format('GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO %I', :'runtime_role')
\gexec
SELECT format(
  'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO %I',
  :'owner_role', :'runtime_role'
)
\gexec
SELECT format(
  'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO %I',
  :'owner_role', :'runtime_role'
)
\gexec
SQL
}

# The migrator owns its service database. The API runtime role receives only
# CONNECT + schema USAGE + DML on tables/sequences in that one database.
for service in auth application people content; do
  case "$service" in
    auth)
      db_name="$AUTH_DB_NAME"; owner="$AUTH_DB_MIGRATOR"; owner_pw="$AUTH_DB_MIGRATOR_PASSWORD"; app="$AUTH_DB_USER"; app_pw="$AUTH_DB_PASSWORD" ;;
    application)
      db_name="$APP_DB_NAME"; owner="$APP_DB_MIGRATOR"; owner_pw="$APP_DB_MIGRATOR_PASSWORD"; app="$APP_DB_USER"; app_pw="$APP_DB_PASSWORD" ;;
    people)
      db_name="$PEOPLE_DB_NAME"; owner="$PEOPLE_DB_MIGRATOR"; owner_pw="$PEOPLE_DB_MIGRATOR_PASSWORD"; app="$PEOPLE_DB_USER"; app_pw="$PEOPLE_DB_PASSWORD" ;;
    content)
      db_name="$CONTENT_DB_NAME"; owner="$CONTENT_DB_MIGRATOR"; owner_pw="$CONTENT_DB_MIGRATOR_PASSWORD"; app="$CONTENT_DB_USER"; app_pw="$CONTENT_DB_PASSWORD" ;;
  esac
  : "${db_name:?Missing database name for $service}"
  : "${owner:?Missing migrator role for $service}"
  : "${owner_pw:?Missing migrator password for $service}"
  : "${app:?Missing runtime role for $service}"
  : "${app_pw:?Missing runtime password for $service}"

  echo "[postgres-init] Configuring isolated database: $db_name"
  ensure_role "$owner" "$owner_pw"
  ensure_role "$app" "$app_pw"
  ensure_database "$db_name" "$owner" "$app"
done

echo '[postgres-init] Database roles and databases are ready.'
