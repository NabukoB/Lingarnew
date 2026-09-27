#!/bin/sh
# Creates the RLS-bound login role the api/radius/worker connect as.
# The schema owner (POSTGRES_USER) runs the migrations; wisp_api never owns
# tables, so row-level security always applies to it.
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
END
\$\$;
SQL
