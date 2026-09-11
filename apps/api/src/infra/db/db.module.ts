import type { Env } from '@easytrip/contracts';
import { createDbClient, type DbClient } from '@easytrip/database';
import { Global, Inject, Module, type OnModuleDestroy } from '@nestjs/common';
import { ENV_TOKEN } from '../config/env.token.js';

export const DB_CLIENT = Symbol('ETN_DB_CLIENT');

/**
 * Database module (Arch §23 `infra/db`).
 *
 * Owns the single pooled PostgreSQL client. Global because every domain module
 * needs data access; the pool is closed on shutdown so SIGTERM drains cleanly
 * (Arch §15.2).
 */
@Global()
@Module({
  providers: [
    {
      provide: DB_CLIENT,
      inject: [ENV_TOKEN],
      useFactory: (env: Env): DbClient =>
        createDbClient({
          connectionString: env.DATABASE_URL,
          poolMax: env.DB_POOL_MAX,
          statementTimeoutMs: env.DB_STATEMENT_TIMEOUT_MS,
          applicationName: env.SERVICE_NAME,
        }),
    },
  ],
  exports: [DB_CLIENT],
})
export class DbModule implements OnModuleDestroy {
  constructor(@Inject(DB_CLIENT) private readonly client: DbClient) {}

  async onModuleDestroy(): Promise<void> {
    await this.client.close();
  }
}
