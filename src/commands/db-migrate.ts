import { listAppliedMigrations, resolveMigrationsFolder, runMigrations } from '@easytrip/database';
import { withDbClient } from '../lib/db.js';
import { loadWorkspaceEnv, redactConnectionString } from '../lib/env-loader.js';

/** `pnpm db:migrate` — apply every pending migration. */
export async function dbMigrate(): Promise<number> {
  const env = loadWorkspaceEnv();
  process.stdout.write(`[db] target ${redactConnectionString(env.DATABASE_URL)}\n`);

  await withDbClient(env, async (client) => {
    const folder = resolveMigrationsFolder();
    await runMigrations(client, { migrationsFolder: folder });
    const applied = await listAppliedMigrations(client);
    process.stdout.write(`[db] migrations applied from ${folder}\n`);
    process.stdout.write(`[db] ${String(applied.length)} migration(s) recorded\n`);
    for (const entry of applied) {
      process.stdout.write(`     ${entry.hash.slice(0, 16)}  ${entry.createdAt.toISOString()}\n`);
    }
  });
  return 0;
}
