import { loadEnv, type Env } from '@easytrip/contracts';
import type { DbClient } from '@easytrip/database';
import { HealthService } from '../../src/modules/health/health.service';
import type { RedisService } from '../../src/infra/redis/redis.service';

/** Env built through the real schema so the test cannot drift from production defaults. */
function env(overrides: Record<string, string> = {}): Env {
  return loadEnv({
    APP_ENV: 'test',
    DATABASE_URL: 'postgresql://easytrip:easytrip@127.0.0.1:5432/easytrip_test',
    // Auth secrets have no defaults by design (Arch §5.2, DB-04); tests must
    // supply them exactly as a real deployment does.
    JWT_SECRET: 'test-jwt-secret-0123456789abcdef-0123456789abcdef-0123456789abcdef',
    ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    IP_HASH_SALT: 'test-ip-hash-salt-0123456789abcdef',
    ...overrides,
  });
}

interface FakeDb {
  pool: { query: jest.Mock };
}

function fakeDb(options: { version?: string; tables?: string[]; fail?: boolean }): FakeDb {
  return {
    pool: {
      query: jest.fn((sql: string): Promise<{ rows: unknown[] }> => {
        if (options.fail === true) return Promise.reject(new Error('ECONNREFUSED 127.0.0.1:5432'));
        if (sql.includes('version()')) {
          return Promise.resolve({ rows: [{ version: options.version ?? 'PostgreSQL 16.14' }] });
        }
        if (sql.includes('pg_tables')) {
          return Promise.resolve({
            rows: (options.tables ?? []).map((tablename) => ({ tablename })),
          });
        }
        return Promise.resolve({ rows: [] });
      }),
    },
  };
}

function fakeRedis(ok: boolean, message?: string): RedisService {
  return {
    ping: jest.fn(() => Promise.resolve({ ok, latencyMs: 0.4, ...(message ? { message } : {}) })),
  } as unknown as RedisService;
}

describe('HealthService', () => {
  it('reports ok when postgres and redis are up and the schema is migrated', async () => {
    const service = new HealthService(
      fakeDb({ tables: ['outbox'] }) as unknown as DbClient,
      env(),
      fakeRedis(true),
    );

    const report = await service.report();
    expect(report.status).toBe('ok');
    expect(report.service).toBe('easytrip-api');
    expect(report.environment).toBe('test');
    expect(report.checks.find((check) => check.name === 'database')?.state).toBe('up');
    expect(report.checks.find((check) => check.name === 'database')?.message).toContain(
      'PostgreSQL',
    );
  });

  it('reports down (not ok) when the database connection fails', async () => {
    const service = new HealthService(
      fakeDb({ fail: true }) as unknown as DbClient,
      env(),
      fakeRedis(true),
    );

    const report = await service.report();
    expect(report.status).toBe('down');
    const database = report.checks.find((check) => check.name === 'database');
    expect(database?.state).toBe('down');
    expect(database?.message).toContain('ECONNREFUSED');
  });

  it('reports degraded when the connection works but migrations are pending', async () => {
    const service = new HealthService(
      fakeDb({ tables: [] }) as unknown as DbClient,
      env(),
      fakeRedis(true),
    );

    const report = await service.report();
    expect(report.status).toBe('degraded');
    expect(report.checks.find((check) => check.name === 'database')?.message).toContain(
      'migrations pending',
    );
  });

  it('treats redis as optional by default (degraded, not down)', async () => {
    const service = new HealthService(
      fakeDb({ tables: ['outbox'] }) as unknown as DbClient,
      env(),
      fakeRedis(false, 'connect ECONNREFUSED'),
    );

    const report = await service.report();
    expect(report.status).toBe('degraded');
  });

  it('treats redis as required when REDIS_REQUIRED=true', async () => {
    const service = new HealthService(
      fakeDb({ tables: ['outbox'] }) as unknown as DbClient,
      env({ REDIS_REQUIRED: 'true' }),
      fakeRedis(false, 'connect ECONNREFUSED'),
    );

    const report = await service.report();
    expect(report.status).toBe('down');
  });
});
