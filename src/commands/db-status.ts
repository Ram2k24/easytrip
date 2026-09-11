import { assertSchemaReady, listAppliedMigrations, probeDatabase } from '@easytrip/database';
import { withDbClient } from '../lib/db.js';
import { loadWorkspaceEnv, redactConnectionString } from '../lib/env-loader.js';

/** `pnpm db:status` — connectivity, server version, migrations and expected tables. */
export async function dbStatus(): Promise<number> {
  const env = loadWorkspaceEnv();
  process.stdout.write(`[db] target ${redactConnectionString(env.DATABASE_URL)}\n`);

  return withDbClient(env, async (client) => {
    const probe = await probeDatabase(client);
    if (!probe.ok) {
      process.stdout.write(`✗ unreachable (${probe.message ?? 'unknown error'})\n`);
      return 1;
    }
    process.stdout.write(`✓ connected in ${String(probe.latencyMs)}ms\n`);
    process.stdout.write(`  server   ${probe.version ?? 'unknown'}\n`);

    const applied = await listAppliedMigrations(client);
    process.stdout.write(`  migrations ${String(applied.length)} applied\n`);

    const missing = await assertSchemaReady(client, env.DB_SCHEMA_TABLES);
    if (missing.length > 0) {
      process.stdout.write(`✗ missing tables: ${missing.join(', ')} — run "pnpm db:migrate"\n`);
      return 1;
    }
    process.stdout.write(`  tables   ${env.DB_SCHEMA_TABLES.join(', ')} present\n`);
    return 0;
  });
}
