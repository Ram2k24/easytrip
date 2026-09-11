import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema/index.js';

/** Drizzle database handle with the full Easy Trip Nepal schema inferred. */
export type Database = NodePgDatabase<typeof schema>;

export interface DbConfig {
  connectionString: string;
  /** Max pooled clients (env `DB_POOL_MAX`, default 10). */
  poolMax?: number;
  /** Per-statement timeout in ms (env `DB_STATEMENT_TIMEOUT_MS`, default 10000). */
  statementTimeoutMs?: number;
  /** Application name reported in `pg_stat_activity`. */
  applicationName?: string;
}

export interface DbClient {
  pool: pg.Pool;
  db: Database;
  /** End the pool. Awaited on graceful shutdown (Arch §15.2). */
  close(): Promise<void>;
}

/**
 * Create a pooled PostgreSQL client.
 *
 * `statement_timeout` is applied per-connection so a runaway query cannot pin a
 * pool slot; the pool itself is bounded by `poolMax`.
 */
export function createDbClient(config: DbConfig): DbClient {
  const pool = new pg.Pool({
    connectionString: config.connectionString,
    max: config.poolMax ?? 10,
    application_name: config.applicationName ?? 'easytrip',
    // Fail fast on connection problems instead of queueing forever.
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
    statement_timeout: config.statementTimeoutMs ?? 10_000,
  });

  // A dead backend client must not take the process down with it (Arch §17.3).
  pool.on('error', (error: Error) => {
    console.error('[db] idle client error', { message: error.message });
  });

  const db = drizzle(pool, { schema, logger: false });

  // Shutdown hooks can fire more than once (a module registered in several
  // contexts, or SIGTERM racing SIGINT), and pg throws "Called end on pool more
  // than once" on a second end(). Memoise so close() is idempotent and every
  // caller awaits the same teardown (Arch §15.2).
  let closing: Promise<void> | null = null;

  return {
    pool,
    db,
    close(): Promise<void> {
      closing ??= pool.end();
      return closing;
    },
  };
}

export interface ProbeResult {
  ok: boolean;
  latencyMs: number;
  /** PostgreSQL version string when the probe succeeded. */
  version?: string;
  message?: string;
}

/**
 * Liveness probe used by `GET /health`: one round-trip that also returns the
 * server version, so a green health check proves real connectivity.
 */
export async function probeDatabase(client: DbClient): Promise<ProbeResult> {
  const started = process.hrtime.bigint();
  try {
    const result = await client.pool.query<{ version: string }>('select version() as version');
    const latencyMs = Number(process.hrtime.bigint() - started) / 1e6;
    return {
      ok: true,
      latencyMs: Math.round(latencyMs * 100) / 100,
      version: result.rows[0]?.version,
    };
  } catch (error) {
    const latencyMs = Number(process.hrtime.bigint() - started) / 1e6;
    return {
      ok: false,
      latencyMs: Math.round(latencyMs * 100) / 100,
      message: error instanceof Error ? error.message : 'unknown database error',
    };
  }
}
