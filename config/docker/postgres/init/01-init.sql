-- Local development bootstrap (Arch §26). Runs once on an empty data volume.
-- Extensions required by the schema conventions (DB §2 C-10).
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
