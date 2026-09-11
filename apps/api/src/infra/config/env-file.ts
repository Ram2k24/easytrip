import { existsSync } from 'node:fs';
import path from 'node:path';

/**
 * Local-development `.env` loading (Arch §26).
 *
 * Only `main.ts` calls this. In staging/production the environment comes from the
 * orchestrator (Docker Compose `environment:` / server `.env`, Arch §20.4) and no
 * file is read — which is exactly why `buildApplication` takes an explicit `Env`.
 *
 * Uses Node's built-in `process.loadEnvFile` (Node 20.12+), so no dependency.
 */
export function loadEnvFiles(cwd: string = process.cwd()): string[] {
  const appEnv = process.env.APP_ENV ?? 'development';
  const configDir = path.resolve(cwd, 'config', 'env');

  // Lowest precedence first: each call overwrites what came before it.
  const candidates = [
    path.resolve(cwd, '.env'),
    path.join(configDir, '.env'),
    path.join(configDir, `.env.${appEnv}`),
    path.join(configDir, '.env.local'),
  ];

  const loaded: string[] = [];
  for (const file of candidates) {
    if (!existsSync(file)) continue;
    process.loadEnvFile(file);
    loaded.push(file);
  }
  return loaded;
}
