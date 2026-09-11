-- 0001_extensions — schema conventions DB §2 C-10.
--
-- Hand-written: drizzle-kit cannot express CREATE EXTENSION, and these must exist
-- on *every* database regardless of how it was provisioned. The Docker bootstrap
-- (config/docker/postgres/init/01-init.sql) also creates them for an empty volume,
-- but `pnpm db:serve` and managed providers do not run that file, so the migration
-- is the authoritative place. IF NOT EXISTS makes both paths idempotent.
--
--   citext   — case-insensitive TEXT. Email uniqueness must not depend on the
--              caller lowercasing correctly (PRD CV-01 canonicalisation).
--   pg_trgm  — trigram indexes backing admin search (Arch §4.4).

CREATE EXTENSION IF NOT EXISTS citext;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;
