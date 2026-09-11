import { loadEnv, parseEnv } from '@easytrip/contracts';

const base = {
  APP_ENV: 'development',
  DATABASE_URL: 'postgresql://easytrip:easytrip@127.0.0.1:5432/easytrip',
};

/** Narrow the discriminated union so the success shape is usable directly. */
function parseOk(raw: Record<string, string>) {
  const result = parseEnv(raw);
  if (!result.ok) throw new Error(result.message);
  return result.env;
}

describe('environment schema (Arch §25.1 fail-fast)', () => {
  it('applies documented defaults', () => {
    const env = parseOk(base);
    expect(env.DB_POOL_MAX).toBe(10);
    expect(env.DB_STATEMENT_TIMEOUT_MS).toBe(10_000);
    expect(env.PORT).toBe(4000);
    expect(env.ALLOWED_ORIGINS).toEqual(['http://localhost:3000']);
    expect(env.DB_SCHEMA_TABLES).toEqual(['outbox']);
    expect(env.REDIS_REQUIRED).toBe(false);
    expect(env.TZ_DEFAULT).toBe('Asia/Katmandu');
  });

  it('fails with a field map when DATABASE_URL is missing', () => {
    const result = parseEnv({ APP_ENV: 'development' });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected failure');
    expect(Object.keys(result.fields)).toContain('DATABASE_URL');
  });

  it('rejects debug logging in production', () => {
    const result = parseEnv({
      ...base,
      APP_ENV: 'production',
      LOG_LEVEL: 'debug',
      REDIS_REQUIRED: 'true',
    });
    expect(result.ok).toBe(false);
  });

  it('rejects a localhost database in production', () => {
    const result = parseEnv({
      ...base,
      APP_ENV: 'production',
      REDIS_REQUIRED: 'true',
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/easytrip',
    });
    expect(result.ok).toBe(false);
  });

  it('accepts a valid production configuration', () => {
    const env = loadEnv({
      APP_ENV: 'production',
      LOG_LEVEL: 'info',
      REDIS_REQUIRED: 'true',
      DATABASE_URL: 'postgresql://user:pass@db.internal:5432/easytrip',
    });
    expect(env.APP_ENV).toBe('production');
  });
});
