import { loadEnv, type Env } from '@easytrip/contracts';

/** Build a validated `Env` for tests — same schema production boots with. */
export function testEnv(connectionString: string, overrides: Record<string, string> = {}): Env {
  return loadEnv({
    NODE_ENV: 'test',
    APP_ENV: 'test',
    APP_VERSION: '0.5.0-test',
    SERVICE_NAME: 'easytrip-api-test',
    LOG_LEVEL: 'silent',
    DATABASE_URL: connectionString,
    // Nothing listens here on purpose: the API must boot and serve without Redis.
    REDIS_URL: 'redis://127.0.0.1:6390',
    REDIS_CONNECT_TIMEOUT_MS: '300',
    REDIS_REQUIRED: 'false',
    ...overrides,
  });
}
