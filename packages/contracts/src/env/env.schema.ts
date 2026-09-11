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
