import { startDevPostgres } from '../lib/dev-postgres.js';
import { loadWorkspaceEnv } from '../lib/env-loader.js';

/** `pnpm db:serve` — run a local PostgreSQL 16 without Docker. */
export async function dbServe(): Promise<number> {
  const env = loadWorkspaceEnv();
  const url = new URL(env.DATABASE_URL);

  await startDevPostgres({
    port: Number(url.port || 5432),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ''),
  });

  // Keeps the process alive until SIGINT/SIGTERM.
  await new Promise<void>(() => undefined);
  return 0;
}
