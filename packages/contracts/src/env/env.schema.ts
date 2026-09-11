import { z } from 'zod';
import { AppEnvSchema, LogLevelSchema } from '../common/enums.js';
import { zodIssuesToFieldMap, type FieldErrorMap } from '../validation/field-errors.js';

/**
 * Environment variable catalog (Arch §25.2) — zod-validated at boot, fail fast
 * on missing/invalid values (Arch §25.1).
 *
 * This schema is shared by the API, the web app and the workspace CLI so there is
 * exactly one definition of what a valid environment looks like. Secrets have no
 * defaults; non-secret operational values do (documented per Arch §25.2).
 */
const booleanFromEnv = z
  .enum(['true', 'false', '1', '0'])
  .transform((value) => value === 'true' || value === '1');

const csvList = z.string().transform((value) =>
  value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0),
);

export const EnvSchema = z
  .object({
    // App
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    APP_ENV: AppEnvSchema.default('development'),
    APP_NAME: z.string().min(1).default('easytrip'),
    APP_VERSION: z.string().min(1).default('0.5.0'),
    APP_URL: z.url().default('http://localhost:3000'),
    API_URL: z.url().default('http://127.0.0.1:4000'),
    WEB_ORIGIN: z.url().default('http://localhost:3000'),
    ALLOWED_ORIGINS: csvList.default(['http://localhost:3000']),
    LOG_LEVEL: LogLevelSchema.default('info'),
    LOG_PRETTY: booleanFromEnv.default(false),
    TZ_DEFAULT: z.string().min(1).default('Asia/Katmandu'),
    SERVICE_NAME: z.string().min(1).default('easytrip-api'),

    // HTTP
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    HOST: z.string().min(1).default('0.0.0.0'),
    BODY_LIMIT: z.string().min(1).default('1mb'),
    SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().min(100).default(10_000),

    // Database (PostgreSQL 16, Arch §4.1)
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    DB_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
    DB_STATEMENT_TIMEOUT_MS: z.coerce.number().int().min(100).default(10_000),
    DB_SCHEMA_TABLES: csvList.default(['outbox']),

    // Redis (cache / rate limit / queues, Arch §11)
    REDIS_URL: z.string().min(1).default('redis://127.0.0.1:6379'),
    REDIS_PREFIX: z.string().min(1).default('easytrip'),
    /**
     * When false the API boots without Redis and reports it as `down` in health
     * (Arch §17.3 degradation matrix). Production sets this to true.
     */
    REDIS_REQUIRED: booleanFromEnv.default(false),
    /** Boot must never hang on an unreachable cache (Arch §17.3 degradation). */
    REDIS_CONNECT_TIMEOUT_MS: z.coerce.number().int().min(100).default(1_500),

    // Telemetry (OTel, Arch §15) — opt-in so local dev needs no collector
    OTEL_ENABLED: booleanFromEnv.default(false),
    OTEL_ENDPOINT: z.string().optional(),
    OTEL_EXPORTER: z.enum(['otlp-http', 'console', 'none']).default('none'),
    OTEL_SERVICE_NAME: z.string().min(1).default('easytrip-api'),
    OTEL_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(1),

    // ---- Authentication & authorization (Arch §5, §6) — Phase 06
    /**
     * HS256 signing key for access tokens (Arch §5.2). 32 bytes minimum so the key
     * is not weaker than the hash it signs. Production requires >= 64 chars.
     */
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    JWT_ISSUER: z.string().min(1).default('easytrip'),
    JWT_AUDIENCE: z.string().min(1).default('easytrip-web'),
    /** Access token lifetime (Arch §5.2: 15 min). */
    ACCESS_TOKEN_TTL_S: z.coerce.number().int().min(60).max(3600).default(900),
    /** Refresh token lifetime in days (Arch §5.2: 30 d). */
    REFRESH_TOKEN_TTL_D: z.coerce.number().int().min(1).max(90).default(30),
    /** Set to the app root domain so the cookie is shared across subdomains. */
    COOKIE_DOMAIN: z.string().optional(),
    /** `false` only for local http development; production forces `true`. */
    COOKIE_SECURE: booleanFromEnv.default(true),
    /** Arch §5.2: customers keep at most 5 active families. */
    SESSION_MAX_ACTIVE: z.coerce.number().int().min(1).max(50).default(5),
    /** Arch §5.2: one concurrent admin session per device fingerprint. */
    ADMIN_SESSIONS_PER_FINGERPRINT: z.coerce.number().int().min(1).max(10).default(1),

    // Argon2id parameters (decision E-5 / OWASP baseline, Arch §5.1)
    ARGON2_MEMORY_KIB: z.coerce.number().int().min(8192).default(19_456),
    ARGON2_ITERATIONS: z.coerce.number().int().min(1).default(2),
    ARGON2_PARALLELISM: z.coerce.number().int().min(1).default(1),
    PASSWORD_MIN_LENGTH: z.coerce.number().int().min(8).max(64).default(10),

    // TOTP MFA (RFC 6238, Arch §5.1 / §6.6)
    MFA_ISSUER: z.string().min(1).default('Easy Trip Nepal'),
    MFA_PERIOD_S: z.coerce.number().int().min(15).max(60).default(30),
    MFA_DIGITS: z.coerce.number().int().min(6).max(8).default(6),
    /** ±1 window either side of the current period (RFC 6238 clock skew). */
    MFA_WINDOW: z.coerce.number().int().min(0).max(3).default(1),
    /** A verified step-up stays valid this long (Arch §6.6: 5 min). */
    MFA_STEP_UP_WINDOW_S: z.coerce.number().int().min(30).max(3600).default(300),
    MFA_MAX_ATTEMPTS: z.coerce.number().int().min(3).max(20).default(5),

    // One-time codes (Arch §5.1: 6-digit, 10-min verify / 30-min reset)
    OTP_DIGITS: z.coerce.number().int().min(6).max(8).default(6),
    OTP_VERIFY_TTL_S: z.coerce.number().int().min(60).max(3600).default(600),
    OTP_RESET_TTL_S: z.coerce.number().int().min(60).max(3600).default(1800),
    OTP_MAX_ATTEMPTS: z.coerce.number().int().min(3).max(20).default(5),
    /** 3 codes per 15 min per identifier (Arch §5.1). */
    OTP_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(50).default(3),
    OTP_RATE_LIMIT_WINDOW_S: z.coerce.number().int().min(60).max(3600).default(900),

    // Auth rate limiting (Arch §5.3: 5 per 15 min, per IP *and* per identifier)
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(1000).default(5),
    AUTH_RATE_LIMIT_WINDOW_S: z.coerce.number().int().min(10).max(3600).default(900),
    /** Progressive lockout after this many consecutive failures. */
    AUTH_MAX_FAILED_ATTEMPTS: z.coerce.number().int().min(3).max(100).default(10),

    /**
     * AES-256-GCM key for at-rest encryption of TOTP secrets (DB-04/D-20).
     * 64 hex chars = 32 bytes. Production requires a non-development value.
     */
    ENCRYPTION_KEY: z
      .string()
      .regex(/^[0-9a-f]{64}$/i, 'ENCRYPTION_KEY must be 64 hex characters (32 bytes)'),
    /** Salt for hashing IPs before storage — a raw IP is PII (DB-04). */
    IP_HASH_SALT: z.string().min(16, 'IP_HASH_SALT must be at least 16 characters'),

    // Email delivery. `log` writes to the structured log — development only.
    MAIL_TRANSPORT: z.enum(['log', 'smtp']).default('log'),
    MAIL_FROM: z.string().min(1).default('Easy Trip Nepal <no-reply@easytrip.local>'),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    SMTP_SECURE: booleanFromEnv.default(false),

    // Web (build-time allowlist, Arch §25.2)
    NEXT_PUBLIC_API_URL: z.string().optional(),
    NEXT_PUBLIC_SITE_NAME: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    // Production hardening assertions (Arch §26, §25.3).
    if (env.APP_ENV === 'production') {
      if (env.LOG_LEVEL === 'trace' || env.LOG_LEVEL === 'debug') {
        ctx.addIssue({
          code: 'custom',
          path: ['LOG_LEVEL'],
          message: 'LOG_LEVEL must be info or higher in production (Arch §14.1)',
        });
      }
      if (!env.REDIS_REQUIRED) {
        ctx.addIssue({
          code: 'custom',
          path: ['REDIS_REQUIRED'],
          message: 'REDIS_REQUIRED must be true in production (rate limiting + queues)',
        });
      }
      if (env.LOG_PRETTY) {
        ctx.addIssue({
          code: 'custom',
          path: ['LOG_PRETTY'],
          message: 'LOG_PRETTY must be false in production (structured JSON logs)',
        });
      }
      // --- Phase 06 auth hardening (Arch §5.2, §5.3, §25.3)
      if (env.JWT_SECRET.length < 64) {
        ctx.addIssue({
          code: 'custom',
          path: ['JWT_SECRET'],
          message: 'JWT_SECRET must be at least 64 characters in production',
        });
      }
      if (!env.COOKIE_SECURE) {
        ctx.addIssue({
          code: 'custom',
          path: ['COOKIE_SECURE'],
          message: 'COOKIE_SECURE must be true in production (refresh token over TLS only)',
        });
      }
      if (env.MAIL_TRANSPORT === 'log') {
        ctx.addIssue({
          code: 'custom',
          path: ['MAIL_TRANSPORT'],
          message: 'MAIL_TRANSPORT must be smtp in production; the log transport drops mail',
        });
      }
      if (env.IP_HASH_SALT.length < 32) {
        ctx.addIssue({
          code: 'custom',
          path: ['IP_HASH_SALT'],
          message: 'IP_HASH_SALT must be at least 32 characters in production',
        });
      }
      // The development key is committed in config/env/.env.development; shipping it
      // would mean every deployment could decrypt every TOTP secret.
      if (
        env.ENCRYPTION_KEY.toLowerCase() === 'a'.repeat(64) ||
        env.ENCRYPTION_KEY === '0'.repeat(64)
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['ENCRYPTION_KEY'],
          message: 'ENCRYPTION_KEY must not be a placeholder value in production',
        });
      }
      if (env.ACCESS_TOKEN_TTL_S > 900) {
        ctx.addIssue({
          code: 'custom',
          path: ['ACCESS_TOKEN_TTL_S'],
          message: 'ACCESS_TOKEN_TTL_S must not exceed 900s (15 min) in production (Arch §5.2)',
        });
      }
    }
    if (env.APP_ENV === 'production' && /@127\.0\.0\.1|@localhost/.test(env.DATABASE_URL)) {
      ctx.addIssue({
        code: 'custom',
        path: ['DATABASE_URL'],
        message: 'DATABASE_URL must not point at localhost in production',
      });
    }
  });

export type Env = z.infer<typeof EnvSchema>;

/** Anything string-valued: `process.env`, a parsed `.env` file, or a test fixture. */
export type EnvSource = Readonly<Record<string, string | undefined>>;

export interface EnvParseFailure {
  ok: false;
  fields: FieldErrorMap;
  message: string;
}
export type EnvParseResult = { ok: true; env: Env } | EnvParseFailure;

/** Parse without throwing — used by `check:env` and by tests. */
export function parseEnv(raw: EnvSource = process.env): EnvParseResult {
  const result = EnvSchema.safeParse(raw);
  if (result.success) return { ok: true, env: result.data };
  const fields = zodIssuesToFieldMap(result.error);
  const message = Object.entries(fields)
    .map(([field, messages]) => `  ${field}: ${messages.join('; ')}`)
    .join('\n');
  return { ok: false, fields, message: `Invalid environment configuration:\n${message}` };
}

/** Parse and throw on failure. Call at the very top of the process entrypoint. */
export function loadEnv(raw: EnvSource = process.env): Env {
  const result = parseEnv(raw);
  if (!result.ok) throw new Error(result.message);
  return result.env;
}
