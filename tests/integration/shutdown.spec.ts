import { buildApplication } from '@easytrip/api';
import { createDbClient, resolveMigrationsFolder, runMigrations } from '@easytrip/database';
import type { INestApplication } from '@nestjs/common';
import { startTestDatabase, type TestDatabase } from '../fixtures/embedded-postgres';
import { testEnv } from '../fixtures/env';

/**
 * Graceful shutdown (Arch §15.2).
 *
 * Two real crashes were found on the SIGTERM path during Phase 05 verification:
 * the Redis service re-read a nulled client inside its own `catch`, and the
 * database pool was `end()`ed more than once. Both are now guarded; this test
 * boots the full application graph against a real cluster and tears it down
 * twice, so a regression in either teardown fails here rather than in production.
 */
describe('graceful shutdown of the full application graph', () => {
  let database: TestDatabase;
  let app: INestApplication;

  beforeAll(async () => {
    database = await startTestDatabase({ port: 55443, label: 'shutdown-spec' });

    const migrations = createDbClient({ connectionString: database.connectionString, poolMax: 2 });
    await runMigrations(migrations, { migrationsFolder: resolveMigrationsFolder() });
    await migrations.close();

    app = await buildApplication({ env: testEnv(database.connectionString) });
    await app.init();
  }, 120_000);

  afterAll(async () => {
    if (database) await database.stop();
  });

  it('serves traffic before shutdown', async () => {
    const server = app.getHttpServer();
    const { default: request } = await import('supertest');
    await request(server as never)
      .get('/health')
      .expect(200);
  });

  it('closes cleanly — every destroy hook completes without throwing', async () => {
    // Exercises DbModule.onModuleDestroy (pool.end) and RedisService.onModuleDestroy.
    await expect(app.close()).resolves.toBeUndefined();
  });

  it('survives a second close (hooks may fire more than once)', async () => {
    // pg.Pool.end() rejects with "Called end on pool more than once" without the
    // idempotency guard in createDbClient.close().
    await expect(app.close()).resolves.toBeUndefined();
  });
});
