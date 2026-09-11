import { isAppError, zodIssuesToFieldMap, type ApiErrorBody } from '@easytrip/contracts';
import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException } from '@nestjs/common';
import { ZodError } from 'zod';
import { catalogKeyForHttpStatus, isContractError } from '../errors/contract.error.js';
import { ERROR_CATALOG } from '@easytrip/contracts';
import { REQUEST_ID_HEADER } from '../context/request-context.js';

/** Minimal logging contract — satisfied by the pino-backed Nest logger. */
export interface ExceptionLogger {
  error(message: string, trace?: string, context?: string): void;
  warn(message: string, context?: string): void;
}

interface RawRequest {
  id?: string;
  method?: string;
  url?: string;
  headers?: Record<string, string | string[] | undefined>;
}

/**
 * Single global exception filter (Arch §17.2).
 *
 * Guarantees every error response matches
 * `{ error: { code, message, details?, requestId } }`, never leaks stack traces or
 * raw provider text, and logs 5xx with full context while 4xx stays at warn.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: ExceptionLogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<{
      status(code: number): { json(body: unknown): void };
      json(body: unknown): void;
      setHeader?(name: string, value: string): void;
    }>();
    const request = ctx.getRequest<RawRequest>();

    const requestId =
      request?.id ??
      (typeof request?.headers?.[REQUEST_ID_HEADER] === 'string'
        ? request.headers[REQUEST_ID_HEADER]
        : 'unknown');
    const body = this.toErrorBody(exception, requestId);
    const status = this.statusFor(body.code, exception);

    this.log(exception, body, status, request, requestId);

    if (typeof response?.setHeader === 'function') {
      response.setHeader(REQUEST_ID_HEADER, requestId);
    }
    if (typeof response?.status === 'function' && typeof response?.json === 'function') {
      response.status(status).json({ error: body });
    }
  }

  private toErrorBody(exception: unknown, requestId: string): ApiErrorBody {
    if (isContractError(exception)) {
      const payload = exception.getResponse() as {
        code: string;
        message: string;
        details?: Record<string, unknown>;
      };
      return {
        code: payload.code,
        message: payload.message,
        ...(payload.details ? { details: payload.details } : {}),
        requestId,
      };
    }

    if (isAppError(exception)) {
      return {
        code: exception.code,
        message: exception.message,
        ...(exception.details ? { details: exception.details } : {}),
        requestId,
      };
    }

    if (exception instanceof ZodError) {
      return {
        code: ERROR_CATALOG.VAL_001.code,
        message: ERROR_CATALOG.VAL_001.defaultMessage,
        details: { fields: zodIssuesToFieldMap(exception) },
        requestId,
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const key = catalogKeyForHttpStatus(status);
      const entry = ERROR_CATALOG[key];
      // Framework messages ("Cannot GET /x", provider text) never reach clients;
      // only our own ContractError/AppError messages do (Arch §17.2).
      return { code: entry.code, message: entry.defaultMessage, requestId };
    }

    // Unknown failures: never expose internals, always expose the requestId.
    return {
      code: ERROR_CATALOG.SYS_500.code,
      message: ERROR_CATALOG.SYS_500.defaultMessage,
      requestId,
    };
  }

  private statusFor(code: string, exception: unknown): number {
    if (exception instanceof HttpException) return exception.getStatus();
    const entry = Object.values(ERROR_CATALOG).find((candidate) => candidate.code === code);
    return entry?.httpStatus ?? 500;
  }

  private log(
    exception: unknown,
    body: ApiErrorBody,
    status: number,
    request: RawRequest | undefined,
    requestId: string,
  ): void {
    const context = {
      requestId,
      code: body.code,
      status,
      method: request?.method,
      url: request?.url,
    };
    if (status >= 500) {
      this.logger.error(
        `request failed ${String(status)} ${body.code}`,
        exception instanceof Error ? exception.stack : String(exception),
        JSON.stringify(context),
      );
      return;
    }
    this.logger.warn(`request rejected ${String(status)} ${body.code}`, JSON.stringify(context));
  }
}
