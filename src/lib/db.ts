import { createDbClient, type DbClient } from '@easytrip/database';
import type { Env } from '@easytrip/contracts';

/** Build a database client from the validated environment. */
export function dbClientFromEnv(env: Env): DbClient {
  return createDbClient({
    connectionString: env.DATABASE_URL,
    poolMax: env.DB_POOL_MAX,
    statementTimeoutMs: env.DB_STATEMENT_TIMEOUT_MS,
    applicationName: 'easytrip-cli',
  });
}

/** Run `task` with a client that is always closed, so the CLI process can exit. */
export async function withDbClient<T>(
  env: Env,
  task: (client: DbClient) => Promise<T>,
): Promise<T> {
  const client = dbClientFromEnv(env);
  try {
    return await task(client);
  } finally {
    await client.close();
  }
}
