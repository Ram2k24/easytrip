/**
 * `@easytrip/database` — PostgreSQL access layer (Arch §4).
 *
 * - `createDbClient` / `probeDatabase`: pooled client + real connectivity probe
 * - `runMigrations` / `listAppliedMigrations` / `assertSchemaReady`: schema lifecycle
 * - `runSeeders`: the development seed mechanism
 * - `schema`: Drizzle table definitions (module-owned prefixes, Arch BR-1)
 */
export * as schema from './schema/index.js';
export * from './client.js';
export * from './migrate.js';
export * from './reset.js';
export * from './seed/index.js';
