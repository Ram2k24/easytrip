import { existsSync } from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import EmbeddedPostgres from 'embedded-postgres';
import { REPO_ROOT } from './env-loader.js';

/**
 * A real, local PostgreSQL 16 server for development **without Docker**.
 *
 * The documented development path is `pnpm infra:up` (Docker Compose, Arch §26).
 * This exists for environments where Docker is unavailable: it runs the genuine
 * PostgreSQL 16 binaries on the host, so migrations, connectivity checks and the
 * health endpoint all exercise a real server rather than a stub.
 */
export interface DevPostgresOptions {
  port: number;
  user: string;
  password: string;
  database: string;
}

export async function startDevPostgres(options: DevPostgresOptions): Promise<void> {
  const dataDir = path.join(REPO_ROOT, '.tmp-pg', 'dev');
  const initialised = existsSync(path.join(dataDir, 'PG_VERSION'));

  const server = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: options.user,
    password: options.password,
    port: options.port,
    persistent: true,
    onLog: (message: string) => process.stdout.write(`[postgres] ${message}`),
    onError: (messageOrError: unknown) =>
      process.stderr.write(`[postgres] ${String(messageOrError)}\n`),
  });

  if (!initialised) await server.initialise();
  await server.start();

  // `postgres` always exists after initdb; the application database may not.
  const admin = new pg.Client({
    host: '127.0.0.1',
    port: options.port,
    user: options.user,
    password: options.password,
    database: 'postgres',
  });
  await admin.connect();
  try {
    const existing = await admin.query<{ datname: string }>(
      'select datname from pg_database where datname = $1',
      [options.database],
    );
    if (existing.rows.length === 0) {
      await server.createDatabase(options.database);
      process.stdout.write(`[postgres] created database "${options.database}"\n`);
    }
  } finally {
    await admin.end();
  }

  process.stdout.write(
    `[postgres] ready on 127.0.0.1:${String(options.port)} (data: ${dataDir})\n` +
      `[postgres] stop with Ctrl+C; data persists between runs\n`,
  );

  const shutdown = async (): Promise<void> => {
    await server.stop();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}
