import { EnvSchema, loadEnv, parseEnv } from '@easytrip/contracts';

const base = {
  APP_ENV: 'development',
  DATABASE_URL: 'postgresql://easytrip:easytrip@127.0.0.1:5432/easytrip',
  // Auth secrets are required with no defaults (Arch §5.2, DB-04), so every
  // fixture must carry them — a missing one is a fail-fast, not a default.
  JWT_SECRET: 'test-jwt-secret-0123456789abcdef-0123456789abcdef-0123456789abcdef',
  ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  IP_HASH_SALT: 'test-ip-hash-salt-0123456789abcdef',
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
      JWT_SECRET: 'test-jwt-secret-0123456789abcdef-0123456789abcdef-0123456789abcdef',
      ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      IP_HASH_SALT: 'test-ip-hash-salt-0123456789abcdef',
      COOKIE_SECURE: 'true',
      MAIL_TRANSPORT: 'smtp',
    });
    expect(env.APP_ENV).toBe('production');
  });

  // --- Phase 06 auth hardening (Arch §5.2, §5.3, §25.3)
  describe('authentication secrets', () => {
    const prodBase = {
      APP_ENV: 'production',
      LOG_LEVEL: 'info',
      REDIS_REQUIRED: 'true',
      DATABASE_URL: 'postgresql://user:pass@db.internal:5432/easytrip',
      JWT_SECRET: 'test-jwt-secret-0123456789abcdef-0123456789abcdef-0123456789abcdef',
      ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      IP_HASH_SALT: 'test-ip-hash-salt-0123456789abcdef',
      COOKIE_SECURE: 'true',
      MAIL_TRANSPORT: 'smtp',
    };

    it('requires JWT_SECRET, ENCRYPTION_KEY and IP_HASH_SALT with no defaults', () => {
      const { JWT_SECRET: _a, ENCRYPTION_KEY: _b, IP_HASH_SALT: _c, ...rest } = base;
      const result = EnvSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('rejects an access token TTL above 15 minutes in production', () => {
      expect(EnvSchema.safeParse({ ...prodBase, ACCESS_TOKEN_TTL_S: '3600' }).success).toBe(false);
    });

    it('rejects a non-secure refresh cookie in production', () => {
      expect(EnvSchema.safeParse({ ...prodBase, COOKIE_SECURE: 'false' }).success).toBe(false);
    });

    it('rejects the log mail transport in production', () => {
      expect(EnvSchema.safeParse({ ...prodBase, MAIL_TRANSPORT: 'log' }).success).toBe(false);
    });

    it('rejects a placeholder ENCRYPTION_KEY in production', () => {
      expect(EnvSchema.safeParse({ ...prodBase, ENCRYPTION_KEY: 'a'.repeat(64) }).success).toBe(
        false,
      );
    });

    it('rejects an ENCRYPTION_KEY that is not 32 bytes of hex', () => {
      expect(EnvSchema.safeParse({ ...prodBase, ENCRYPTION_KEY: 'not-hex' }).success).toBe(false);
    });

    it('rejects Argon2 memory below the OWASP baseline', () => {
      expect(EnvSchema.safeParse({ ...prodBase, ARGON2_MEMORY_KIB: '4096' }).success).toBe(false);
    });
  });
});
