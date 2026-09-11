import { existsSync } from 'node:fs';
import path from 'node:path';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import type { DbClient } from './client.js';

export interface MigrateOptions {
  /** Absolute path to the generated SQL migrations folder. */
  migrationsFolder: string;
}

/** Resolve `migrations/` whether the package is running from `src/` or `dist/`. */
export function resolveMigrationsFolder(fromDir: string = __dirname): string {
  const candidate = path.resolve(fromDir, '..', 'migrations');
  if (!existsSync(candidate)) {
    throw new Error(`Migrations folder not found at ${candidate}. Run "pnpm db:generate".`);
  }
  return candidate;
}

/** Apply all pending migrations (Arch §4.6 expand/contract discipline). */
export async function runMigrations(client: DbClient, options: MigrateOptions): Promise<void> {
  await migrate(client.db, { migrationsFolder: options.migrationsFolder });
}

export interface MigrationJournalEntry {
  hash: string;
  createdAt: Date;
}

/**
 * Read Drizzle's journal of applied migrations.
 *
 * Used by `db:status` and by the health check's schema assertion.
 */
export async function listAppliedMigrations(client: DbClient): Promise<MigrationJournalEntry[]> {
  // `created_at` is a BIGINT of epoch milliseconds; node-postgres returns BIGINT
  // as a string to avoid precision loss, so it must be converted explicitly.
  const rows = await client.pool.query<{ hash: string; created_at: string }>(
    'select hash, created_at from drizzle.__drizzle_migrations order by created_at asc',
  );
  return rows.rows.map((row) => ({ hash: row.hash, createdAt: new Date(Number(row.created_at)) }));
}

/**
 * Verify the schema actually matches what the code expects.
 *
 * A green TCP connection is not proof of a usable database; this asserts the
 * foundation tables exist. Returns the missing tables (empty = healthy).
 */
export async function assertSchemaReady(client: DbClient, expectedTables: readonly string[]) {
  const result = await client.pool.query<{ tablename: string }>(
    `select tablename from pg_tables where schemaname = 'public'`,
  );
  const present = new Set(result.rows.map((row) => row.tablename));
  return expectedTables.filter((table) => !present.has(table));
}
