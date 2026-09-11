import { formatSeedResults, orderedSeeders, runSeeders } from '@easytrip/database';
import { withDbClient } from '../lib/db.js';
import { loadWorkspaceEnv } from '../lib/env-loader.js';

export interface SeedCliOptions {
  only?: string[];
  withDemo?: boolean;
  dryRun?: boolean;
  list?: boolean;
}

/** `pnpm db:seed [--only name] [--with-demo] [--dry-run] [--list]` */
export async function dbSeed(options: SeedCliOptions): Promise<number> {
  if (options.list === true) {
    process.stdout.write('registered seeders:\n');
    for (const seeder of orderedSeeders()) {
      const tag = seeder.developmentOnly === true ? ' [dev-only]' : '';
      process.stdout.write(
        `  ${String(seeder.order).padStart(3)}  ${seeder.name}${tag}\n       ${seeder.description}\n`,
      );
    }
    return 0;
  }

  const env = loadWorkspaceEnv();
  const logger = {
    info: (message: string, meta?: Record<string, unknown>) =>
      process.stdout.write(`[seed] ${message} ${meta ? JSON.stringify(meta) : ''}\n`),
    warn: (message: string, meta?: Record<string, unknown>) =>
      process.stdout.write(`[seed] ! ${message} ${meta ? JSON.stringify(meta) : ''}\n`),
  };

  return withDbClient(env, async (client) => {
    const results = await runSeeders(client, {
      ...(options.only ? { only: options.only } : {}),
      withDemo: options.withDemo === true,
      dryRun: options.dryRun === true,
      logger,
    });
    process.stdout.write(`${formatSeedResults(results)}\n`);
    const applied = results.filter((result) => result.status === 'applied');
    const rows = applied.reduce((sum, result) => sum + result.inserted, 0);
    process.stdout.write(
      `${String(applied.length)} seeder(s) applied, ${String(rows)} row(s) inserted${options.dryRun === true ? ' (dry run — rolled back)' : ''}\n`,
    );
    return 0;
  });
}
