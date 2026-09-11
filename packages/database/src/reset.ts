import type { DbClient } from './client.js';
import { runMigrations, resolveMigrationsFolder } from './migrate.js';

/**
 * Destructive development reset: drop the public schema, recreate it and re-apply
 * every migration (Arch §26 "scripted weekly reset" for non-production envs).
 *
 * Guarded by the caller (the CLI refuses unless APP_ENV is development/test).
 */
export async function resetDatabase(client: DbClient): Promise<void> {
  await client.pool.query('drop schema if exists public cascade');
  await client.pool.query('create schema public');
  await client.pool.query('grant all on schema public to public');
  await runMigrations(client, { migrationsFolder: resolveMigrationsFolder() });
}
