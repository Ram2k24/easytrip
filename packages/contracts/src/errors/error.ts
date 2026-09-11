import { ERROR_CATALOG, type ErrorCatalogKey } from './catalog.js';

/**
 * Framework-neutral application error.
 *
 * Thrown by application/domain code; the API's global exception filter maps it to
 * the wire envelope (Arch §17.2). Keeping it free of framework imports means the
 * same error type can be used by workers, CLIs and tests.
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly httpStatus: number;
  public readonly details?: Record<string, unknown>;
  public override readonly cause?: unknown;

  constructor(
    key: ErrorCatalogKey,
    options: { message?: string; details?: Record<string, unknown>; cause?: unknown } = {},
  ) {
    const catalogEntry = ERROR_CATALOG[key];
    super(options.message ?? catalogEntry.defaultMessage);
    this.name = 'AppError';
    this.code = catalogEntry.code;
    this.httpStatus = catalogEntry.httpStatus;
    if (options.details !== undefined) this.details = options.details;
    if (options.cause !== undefined) this.cause = options.cause;
  }
}

/** Type guard: is the thrown value one of our typed errors? */
export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}
