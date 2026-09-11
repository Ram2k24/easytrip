import type { Database } from '../client.js';

/** Minimal structured logger so seeders work from the CLI, the API and tests. */
export interface SeedLogger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
}

const noop = (): void => undefined;

export const silentLogger: SeedLogger = { info: noop, warn: noop };

export interface SeedContext {
  db: Database;
  logger: SeedLogger;
  /** True when the run was started with `--fresh` (destructive reset performed). */
  fresh: boolean;
  /** True when the run is a dry run (no writes committed). */
  dryRun: boolean;
}

export interface Seeder {
  /** Stable identifier used by `--only`. */
  name: string;
  /** Human-readable purpose (shown in `db:seed --list`). */
  description: string;
  /** Lower runs first. */
  order: number;
  /**
   * Development-only seeders are skipped unless `--with-demo` is passed, keeping
   * synthetic fixtures out of staging/production by construction (Arch §26).
   */
  developmentOnly?: boolean;
  /** Returns the number of rows inserted. */
  run(ctx: SeedContext): Promise<number>;
}

export interface SeedRunResult {
  seeder: string;
  status: 'applied' | 'skipped';
  inserted: number;
  durationMs: number;
  reason?: string;
}
