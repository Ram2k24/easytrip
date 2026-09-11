import { existsSync } from 'node:fs';
import path from 'node:path';
import { config as loadDotenvFile } from 'dotenv';
import { loadEnv, parseEnv, type Env, type EnvParseResult } from '@easytrip/contracts';

/** Repository root (this file lives in `<root>/src/lib`). */
export const REPO_ROOT = path.resolve(__dirname, '..', '..');
export const CONFIG_DIR = path.join(REPO_ROOT, 'config', 'env');

/**
 * Load `.env` files into `process.env` and validate the result.
 *
 * Precedence (highest first — dotenv never overrides a value already present, so
 * real environment variables always win over files):
 *   1. the actual process environment
 *   2. `config/env/.env.local`      (gitignored, developer machine)
 *   3. `config/env/.env.{APP_ENV}`  (per-environment defaults)
 *   4. `config/env/.env`            (shared development defaults)
 *   5. `.env`                       (repo root convenience)
 */
export function loadEnvFiles(appEnv: string = process.env.APP_ENV ?? 'development'): string[] {
  const candidates = [
    path.join(CONFIG_DIR, '.env.local'),
    path.join(CONFIG_DIR, `.env.${appEnv}`),
    path.join(CONFIG_DIR, '.env'),
    path.join(REPO_ROOT, '.env'),
  ];

  const loaded: string[] = [];
  for (const file of candidates) {
    if (!existsSync(file)) continue;
    const result = loadDotenvFile({ path: file });
    if (!result.error) loaded.push(file);
  }
  return loaded;
}

/** Load files, then validate. Throws with a readable field map when invalid. */
export function loadWorkspaceEnv(): Env {
  loadEnvFiles();
  return loadEnv();
}

/** Load files, then validate without throwing (for `check:env`). */
export function inspectWorkspaceEnv(): { loaded: string[]; result: EnvParseResult } {
  const loaded = loadEnvFiles();
  return { loaded, result: parseEnv() };
}

/** Environment variables that are safe to print to a console or CI log. */
export const NON_SECRET_ENV_KEYS = [
  'NODE_ENV',
  'APP_ENV',
  'APP_NAME',
  'APP_VERSION',
  'SERVICE_NAME',
  'HOST',
  'PORT',
  'LOG_LEVEL',
  'LOG_PRETTY',
  'TZ_DEFAULT',
  'DB_POOL_MAX',
  'DB_STATEMENT_TIMEOUT_MS',
  'DB_SCHEMA_TABLES',
  'REDIS_PREFIX',
  'REDIS_REQUIRED',
  'OTEL_ENABLED',
  'OTEL_EXPORTER',
] as const;

/**
 * Redact a connection string for display: credentials never reach the terminal
 * (Arch §25.3 secrets hygiene).
 */
export function redactConnectionString(url: string): string {
  return url.replace(/\/\/([^:/@]+):([^@]+)@/, '//$1:[redacted]@');
}
