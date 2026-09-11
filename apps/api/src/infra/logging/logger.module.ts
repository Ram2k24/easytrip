import type { Env } from '@easytrip/contracts';
import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import type { IncomingMessage } from 'node:http';
import { REQUEST_ID_HEADER, resolveRequestId } from '../../common/context/request-context.js';
import { ENV_TOKEN } from '../config/env.token.js';

/** Routes that are probed constantly and would otherwise dominate the log volume. */
const QUIET_ROUTES = new Set(['/health', '/healthz', '/readyz', '/health/ready']);

/**
 * Structured logging (Arch §14.1): pino JSON in every environment, pino-pretty in
 * local dev, per-request child logger carrying `requestId`.
 *
 * Redaction is a hard requirement — credentials and tokens never reach a log line.
 */
@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      inject: [ENV_TOKEN],
      useFactory: (env: Env) => ({
        pinoHttp: {
          name: env.SERVICE_NAME,
          level: env.LOG_LEVEL,
          genReqId: (
            req: IncomingMessage,
            res: { setHeader(name: string, value: string): void },
          ) => {
            // The correlation middleware runs first and stamps `req.id`; fall back
            // to the inbound header, then to a generated id.
            const existing = (req as IncomingMessage & { id?: unknown }).id;
            const id =
              typeof existing === 'string' && existing.length > 0
                ? existing
                : resolveRequestId(req.headers[REQUEST_ID_HEADER]);
            res.setHeader(REQUEST_ID_HEADER, id);
            return id;
          },
          customProps: (req: IncomingMessage) => ({
            service: env.SERVICE_NAME,
            appEnv: env.APP_ENV,
            route: req.url,
          }),
          redact: {
            censor: '[redacted]',
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              'req.headers["x-api-key"]',
              '*.password',
              '*.token',
              '*.accessToken',
              '*.refreshToken',
              '*.otp',
              '*.cardNumber',
              '*.cvv',
              '*.secret',
            ],
          },
          autoLogging: {
            ignore: (req: IncomingMessage) => QUIET_ROUTES.has(req.url ?? ''),
          },
          // No full request/response bodies in logs (Arch §14.1 budgets).
          serializers: {
            req: (req: IncomingMessage) => ({ method: req.method, url: req.url }),
          },
          transport: env.LOG_PRETTY
            ? {
                target: 'pino-pretty',
                options: { singleLine: true, translateTime: 'SYS:HH:MM:ss.l' },
              }
            : undefined,
          base: { service: env.SERVICE_NAME, env: env.APP_ENV, version: env.APP_VERSION },
        },
      }),
    }),
  ],
  exports: [PinoLoggerModule],
})
export class LoggingModule {}
