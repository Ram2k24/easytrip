import { formatSeedResults, resetDatabase, runSeeders } from '@easytrip/database';
import { withDbClient } from '../lib/db.js';
import { loadWorkspaceEnv, redactConnectionString } from '../lib/env-loader.js';

/**
 * `pnpm db:reset [--with-demo]` — drop the schema, re-migrate and re-seed.
 *
 * Refuses to run outside development/test: this is destructive by design and must
 * never be reachable from staging or production (Arch §26).
 */
export async function dbReset(options: { withDemo?: boolean }): Promise<number> {
  const env = loadWorkspaceEnv();

  if (env.APP_ENV !== 'development' && env.APP_ENV !== 'test') {
    process.stdout.write(
      `✗ db:reset is only permitted in development/test (APP_ENV=${env.APP_ENV})\n`,
    );
    return 1;
  }

  process.stdout.write(`[db] resetting ${redactConnectionString(env.DATABASE_URL)}\n`);
  return withDbClient(env, async (client) => {
    await resetDatabase(client);
    process.stdout.write('[db] schema recreated and migrations applied\n');

    const results = await runSeeders(client, { fresh: true, withDemo: options.withDemo === true });
    process.stdout.write(`${formatSeedResults(results)}\n`);
    return 0;
  });
}
