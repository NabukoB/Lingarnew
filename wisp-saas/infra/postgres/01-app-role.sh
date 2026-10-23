#!/bin/sh
# Creates the login roles the services connect as. The schema owner
# (POSTGRES_USER) runs the migrations; these roles never own tables.
#   wisp_api   (in wisp_app):      api, radius, worker — row-level security always applies.
#   wisp_admin (in wisp_platform): the staff admin console only, created when
#                                  ADMIN_DB_PASSWORD is set. Migration 000004
#                                  grants wisp_platform its column-limited reads.
set -e
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'wisp_app') THEN
    CREATE ROLE wisp_app NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'wisp_api') THEN
    CREATE ROLE wisp_api LOGIN PASSWORD '${APP_DB_PASSWORD:?set APP_DB_PASSWORD}' IN ROLE wisp_app;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'wisp_platform') THEN
    CREATE ROLE wisp_platform NOLOGIN;
  END IF;
  IF '${ADMIN_DB_PASSWORD:-}' <> '' AND NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'wisp_admin') THEN
    CREATE ROLE wisp_admin LOGIN PASSWORD '${ADMIN_DB_PASSWORD:-}' IN ROLE wisp_platform;
  END IF;
END
\$\$;
SQL
