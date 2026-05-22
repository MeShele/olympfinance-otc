-- =============================================================================
-- PostgREST grants for Supabase managed projects.
-- =============================================================================
-- DROP SCHEMA public CASCADE wipes the implicit GRANT SELECT/INSERT/etc
-- that Supabase normally adds for the anon / authenticated / service_role
-- roles. Without these, every PostgREST call returns 42501 "permission
-- denied" — RLS policies are evaluated *after* the catalog grant check.
--
-- This file restores the standard set so a fresh project can be used
-- by the JS client out of the box. Idempotent — safe to re-run.
-- =============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- authenticator is the PG role GoTrue/PostgREST connect as before
-- assuming anon/authenticated. Without USAGE on public it can't even
-- resolve the schema and login fails with "Database error querying
-- schema" (HTTP 500). Granting role membership lets it `SET ROLE` later.
GRANT USAGE ON SCHEMA public TO authenticator;
GRANT anon, authenticated, service_role TO authenticator;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public
  TO anon, authenticated, service_role;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public
  TO anon, authenticated, service_role;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public
  TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated, service_role;
