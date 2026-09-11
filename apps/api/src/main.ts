import 'reflect-metadata';
import path from 'node:path';
import { loadEnv } from '@easytrip/contracts';
import { loadEnvFiles } from './infra/config/env-file.js';
import { Logger } from '@nestjs/common';
import { buildApplication } from './app.factory.js';

/**
 * Process entrypoint.
 *
 * Order matters: the environment is validated **before** Nest boots, so a missing
 * `DATABASE_URL` fails in milliseconds with a readable message instead of halfway
 * through module initialisation (Arch §25.1 fail-fast).
 */
async function bootstrap(): Promise<void> {
  // Dev only: read config/env/.env* so `node dist/main.js` works without a shell
  // wrapper. Production supplies the environment through the orchestrator.
  loadEnvFiles(path.resolve(__dirname, '..', '..', '..'));
  const env = loadEnv();
  const logger = new Logger('bootstrap');

  const app = await buildApplication({ env });
  await app.listen(env.PORT, env.HOST);

  const url = await app.getUrl();
  logger.log(`listening on ${url} (env=${env.APP_ENV}, node=${process.version})`);
  logger.log(`health check: GET ${url}/health`);

  const shutdown = async (signal: string): Promise<void> => {
    logger.log(`received ${signal}, shutting down`);
    const timer = setTimeout(() => {
      logger.error(`shutdown exceeded ${String(env.SHUTDOWN_TIMEOUT_MS)}ms, forcing exit`);
      process.exit(1);
    }, env.SHUTDOWN_TIMEOUT_MS);
    timer.unref();
    await app.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

bootstrap().catch((error: unknown) => {
  // Boot failures print the reason and exit non-zero — never a silent hang.
  console.error('[bootstrap] failed to start', error instanceof Error ? error.message : error);
  process.exit(1);
});
