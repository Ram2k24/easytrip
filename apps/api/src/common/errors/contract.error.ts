import { ERROR_CATALOG, type ErrorCatalogKey } from '@easytrip/contracts';
import { HttpException } from '@nestjs/common';

/**
 * HTTP exception that already carries our wire contract, so the global filter can
 * emit it verbatim (Arch §17.2: typed error classes, single ExceptionFilter).
 */
export class ContractError extends HttpException {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    key: ErrorCatalogKey,
    options: { message?: string; details?: Record<string, unknown>; cause?: unknown } = {},
  ) {
    const entry = ERROR_CATALOG[key];
    const message = options.message ?? entry.defaultMessage;
    super(
      { code: entry.code, message, ...(options.details ? { details: options.details } : {}) },
      entry.httpStatus,
    );
    this.name = 'ContractError';
    this.code = entry.code;
    if (options.details !== undefined) this.details = options.details;
    if (options.cause !== undefined) this.cause = options.cause;
  }
}

export function isContractError(value: unknown): value is ContractError {
  return value instanceof ContractError;
}

/** Map a bare HTTP status onto the closest catalog entry (used for framework errors). */
export function catalogKeyForHttpStatus(status: number): ErrorCatalogKey {
  switch (status) {
    case 400:
      return 'VAL_002';
    case 401:
      return 'AUTH_102';
    case 403:
      return 'AUTHZ_101';
    case 404:
      return 'SYS_404';
    case 409:
      return 'BK_101';
    case 413:
      return 'UP_101';
    case 415:
      return 'UP_102';
    case 422:
      return 'VAL_001';
    case 429:
      return 'SYS_429';
    case 502:
      return 'SYS_502';
    case 503:
      return 'SYS_503';
    default:
      return 'SYS_500';
  }
}
