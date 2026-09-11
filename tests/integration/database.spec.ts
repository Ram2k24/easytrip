import {
  assertSchemaReady,
  createDbClient,
  listAppliedMigrations,
  probeDatabase,
  resolveMigrationsFolder,
  runMigrations,
  runSeeders,
  schema,
  type DbClient,
} from '@easytrip/database';
import { count } from 'drizzle-orm';
import { startTestDatabase, type TestDatabase } from '../fixtures/embedded-postgres';

/**
 * Database connectivity + migration + seed verification against a real
 * PostgreSQL 16 cluster (no mocks).
 */
describe('database (real PostgreSQL 16)', () => {
  let database: TestDatabase;
  let client: DbClient;

  beforeAll(async () => {
    database = await startTestDatabase({ port: 55441, label: 'db-spec' });
    client = createDbClient({ connectionString: database.connectionString, poolMax: 4 });
    await runMigrations(client, { migrationsFolder: resolveMigrationsFolder() });
  });

  afterAll(async () => {
    await client.close();
    await database.stop();
  });

  it('connects and reports the server version', async () => {
    const probe = await probeDatabase(client);
    expect(probe.ok).toBe(true);
    expect(probe.version).toMatch(/PostgreSQL 16\./);
    expect(probe.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('applies migrations and records them in the journal', async () => {
    const applied = await listAppliedMigrations(client);
    expect(applied.length).toBeGreaterThanOrEqual(1);
    expect(applied[0]?.hash).toEqual(expect.any(String));
  });

  it('creates the foundation tables the code declares', async () => {
    await expect(assertSchemaReady(client, ['outbox'])).resolves.toEqual([]);
    await expect(assertSchemaReady(client, ['outbox', 'does_not_exist'])).resolves.toEqual([
      'does_not_exist',
    ]);
  });

  it('writes real rows through the seed mechanism and reads them back', async () => {
    const before = await client.db.select({ rows: count() }).from(schema.outbox);
    const results = await runSeeders(client, {});

    expect(results.map((result) => result.seeder)).toContain('foundation.platform-seeded-event');
    expect(results.find((result) => result.seeder === 'demo.outbox-fixtures')?.status).toBe(
      'skipped',
    );

    const after = await client.db.select({ rows: count() }).from(schema.outbox);
    expect(Number(after[0]?.rows ?? 0)).toBe(Number(before[0]?.rows ?? 0) + 1);

    const rows = await client.db.select().from(schema.outbox).orderBy(schema.outbox.createdAt);
    expect(rows[0]?.eventType).toBe('platform.seeded');
    expect(rows[0]?.id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(rows[0]?.publishedAt).toBeNull();
  });

  it('includes synthetic fixtures only when explicitly requested', async () => {
    const before = await client.db.select({ rows: count() }).from(schema.outbox);
    const results = await runSeeders(client, { withDemo: true, only: ['demo.outbox-fixtures'] });

    const demo = results.find((result) => result.seeder === 'demo.outbox-fixtures');
    expect(demo?.status).toBe('applied');
    expect(demo?.inserted).toBe(3);

    const after = await client.db.select({ rows: count() }).from(schema.outbox);
    expect(Number(after[0]?.rows ?? 0)).toBe(Number(before[0]?.rows ?? 0) + 3);
  });

  it('rolls the whole run back in dry-run mode', async () => {
    const before = await client.db.select({ rows: count() }).from(schema.outbox);
    await runSeeders(client, { dryRun: true, withDemo: true });
    const after = await client.db.select({ rows: count() }).from(schema.outbox);
    expect(Number(after[0]?.rows ?? 0)).toBe(Number(before[0]?.rows ?? 0));
  });

  it('rejects unknown seeder names instead of silently doing nothing', async () => {
    await expect(runSeeders(client, { only: ['nope'] })).rejects.toThrow(/Unknown seeder/);
  });
});
