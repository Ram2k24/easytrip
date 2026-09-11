import { drizzle } from 'drizzle-orm/node-postgres';
import type { DbClient } from '../client.js';
import * as schema from '../schema/index.js';
import { orderedSeeders } from './registry.js';
import { silentLogger, type SeedLogger, type SeedRunResult } from './types.js';

export interface SeedOptions {
  /** Run only these seeders (matched by `Seeder.name`). */
  only?: readonly string[];
  /** Include development-only (synthetic fixture) seeders. */
  withDemo?: boolean;
  /** Report what would run without committing anything. */
  dryRun?: boolean;
  /** Set when the caller already dropped/recreated the schema. */
  fresh?: boolean;
  logger?: SeedLogger;
}

/**
 * Execute the seeder registry inside a single transaction.
 *
 * A dedicated pooled connection is used so the seeders receive a `Database`
 * handle that is genuinely bound to one transaction: a failure anywhere rolls
 * the whole run back.
 */
export async function runSeeders(
  client: DbClient,
  options: SeedOptions = {},
): Promise<SeedRunResult[]> {
  const logger = options.logger ?? silentLogger;
  const registry = orderedSeeders();
  const only = options.only && options.only.length > 0 ? new Set(options.only) : null;

  if (only) {
    const known = new Set(registry.map((seeder) => seeder.name));
    const unknown = [...only].filter((name) => !known.has(name));
    if (unknown.length > 0) {
      throw new Error(
        `Unknown seeder(s): ${unknown.join(', ')}. Known seeders: ${[...known].join(', ')}`,
      );
    }
  }

  const connection = await client.pool.connect();
  const results: SeedRunResult[] = [];
  try {
    await connection.query('begin');
    const txDb = drizzle(connection, { schema, logger: false });

    for (const seeder of registry) {
      if (only && !only.has(seeder.name)) {
        results.push({
          seeder: seeder.name,
          status: 'skipped',
          inserted: 0,
          durationMs: 0,
          reason: 'not selected',
        });
        continue;
      }
      if (seeder.developmentOnly === true && options.withDemo !== true) {
        results.push({
          seeder: seeder.name,
          status: 'skipped',
          inserted: 0,
          durationMs: 0,
          reason: 'development-only (pass --with-demo)',
        });
        continue;
      }

      const started = process.hrtime.bigint();
      const inserted = await seeder.run({
        db: txDb,
        logger,
        fresh: options.fresh === true,
        dryRun: options.dryRun === true,
      });
      const durationMs = Math.round((Number(process.hrtime.bigint() - started) / 1e6) * 100) / 100;
      results.push({ seeder: seeder.name, status: 'applied', inserted, durationMs });
      logger.info('seeder applied', { seeder: seeder.name, inserted, durationMs });
    }

    if (options.dryRun === true) {
      await connection.query('rollback');
      logger.warn('dry run: transaction rolled back, nothing was written');
    } else {
      await connection.query('commit');
    }
    return results;
  } catch (error) {
    await connection.query('rollback').catch(() => undefined);
    throw error;
  } finally {
    connection.release();
  }
}

/** Human-readable summary of a seed run (used by the CLI). */
export function formatSeedResults(results: readonly SeedRunResult[]): string {
  if (results.length === 0) return 'no seeders ran';
  return results
    .map((result) => {
      const detail =
        result.status === 'applied'
          ? `+${String(result.inserted)} rows`
          : `skipped (${result.reason ?? 'n/a'})`;
      return `  ${result.status === 'applied' ? '✓' : '·'} ${result.seeder} — ${detail} in ${String(result.durationMs)}ms`;
    })
    .join('\n');
}
