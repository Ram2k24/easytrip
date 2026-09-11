import { rm } from 'node:fs/promises';
import path from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';

/**
 * A real PostgreSQL 16 cluster for integration tests.
 *
 * Not a mock and not an emulator: `embedded-postgres` ships the genuine server
 * binaries, so migrations, constraints, `timestamptz` handling and query plans are
 * all exercised for real. `persistent: false` wipes the data directory on stop.
 */
export interface TestDatabase {
  port: number;
  user: string;
  password: string;
  database: string;
  connectionString: string;
  stop(): Promise<void>;
}

export async function startTestDatabase(options: {
  port: number;
  database?: string;
  label: string;
}): Promise<TestDatabase> {
  const user = 'easytrip';
  const password = 'easytrip';
  const database = options.database ?? 'easytrip_test';
  const dataDir = path.resolve(process.cwd(), '..', '.tmp-pg', options.label);

  await rm(dataDir, { recursive: true, force: true });

  const server = new EmbeddedPostgres({
    databaseDir: dataDir,
    user,
    password,
    port: options.port,
    persistent: false,
    onLog: () => undefined,
    onError: (messageOrError: unknown) => {
      const text = typeof messageOrError === 'string' ? messageOrError : String(messageOrError);
      if (text.trim().length > 0) process.stderr.write(`[pg:${options.label}] ${text}\n`);
    },
  });

  await server.initialise();
  await server.start();
  await server.createDatabase(database);

  return {
    port: options.port,
    user,
    password,
    database,
    connectionString: `postgresql://${user}:${password}@127.0.0.1:${String(options.port)}/${database}`,
    async stop() {
      await server.stop();
    },
  };
}
