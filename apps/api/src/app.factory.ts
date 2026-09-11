import { loadEnv, type Env } from '@easytrip/contracts';
import { type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { Logger as PinoLogger } from 'nestjs-pino';
import { AppModule } from './app.module.js';
import { CorrelationIdMiddleware } from './common/middleware/correlation.middleware.js';
import type {
  CorrelationRequest,
  CorrelationResponse,
} from './common/middleware/correlation.middleware.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { EnvelopeInterceptor } from './common/interceptors/envelope.interceptor.js';
import { MetricsInterceptor } from './infra/telemetry/metrics.interceptor.js';

export interface BuildApplicationOptions {
  /** Pre-validated environment. Defaults to validating `process.env`. */
  env?: Env;
}

/**
 * Build (but do not start) the Nest application.
 *
 * Exported separately from `main.ts` so integration tests can boot the exact same
 * wiring the server uses — no parallel test-only app graph.
 */
export async function buildApplication(
  options: BuildApplicationOptions = {},
): Promise<INestApplication> {
  const env = options.env ?? loadEnv();

  const app = await NestFactory.create<NestExpressApplication>(AppModule.register(env), {
    bufferLogs: true,
    // Fail fast on unhandled rejections inside the request pipeline (Arch §17.2).
    abortOnError: false,
  });

  // Route Nest's internal logging through pino (Arch §14.1).
  const logger = app.get(PinoLogger);
  app.useLogger(logger);

  // Security headers (Arch §33.1 baseline). CSP is not meaningful for a JSON API.
  app.use(
    helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }),
  );

  // CORS is a strict allowlist from env (Arch §25.2).
  app.enableCors({
    origin: env.ALLOWED_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'x-request-id'],
    exposedHeaders: ['x-request-id', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'Retry-After'],
  });

  // Bounded request bodies (Arch §33.1: no unbounded payloads).
  app.useBodyParser('json', { limit: env.BODY_LIMIT });
  app.useBodyParser('urlencoded', { extended: true, limit: env.BODY_LIMIT });

  // Correlation id first, so even parse failures carry a requestId.
  const correlation = app.get(CorrelationIdMiddleware);
  app.use((req: unknown, res: unknown, next: () => void) => {
    correlation.use(req as CorrelationRequest, res as CorrelationResponse, next);
  });

  app.useGlobalInterceptors(app.get(MetricsInterceptor), app.get(EnvelopeInterceptor));
  app.useGlobalFilters(new AllExceptionsFilter(logger));

  // Drain DB/Redis on SIGTERM (Arch §15.2).
  app.enableShutdownHooks();

  return app;
}

export { AppModule };
