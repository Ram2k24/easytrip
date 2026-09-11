import type { ApiErrorBody, ApiEnvelope } from '@easytrip/contracts';

/**
 * Typed API client (Arch §1.3: no hand-written DTO drift, no `fetch` outside
 * `lib/api`).
 *
 * Unwraps the success envelope and converts error envelopes into a typed error so
 * callers never have to know the wire shape (Arch §3.3).
 */
export class ApiClientError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly requestId: string;
  public readonly details?: Record<string, unknown>;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = body.code;
    this.requestId = body.requestId;
    if (body.details !== undefined) this.details = body.details;
  }
}

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  /** Correlation id forwarded as `x-request-id` (Phase 02 ER-01). */
  requestId?: string;
}

export interface ApiClient {
  get<T>(path: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>): Promise<T>;
  send<T>(path: string, options: ApiRequestOptions): Promise<T>;
}

export function createApiClient(baseUrl: string): ApiClient {
  async function request<T>(path: string, options: ApiRequestOptions): Promise<T> {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        accept: 'application/json',
        ...(options.body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(options.requestId !== undefined ? { 'x-request-id': options.requestId } : {}),
      },
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
      ...(options.signal !== undefined ? { signal: options.signal } : {}),
    });

    const payload: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      const body = asErrorBody(payload, response.status);
      throw new ApiClientError(response.status, body);
    }

    return unwrap<T>(payload);
  }

  return {
    get: <T>(path: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
      request<T>(path, options ?? {}),
    send: <T>(path: string, options: ApiRequestOptions) => request<T>(path, options),
  };
}

function asErrorBody(payload: unknown, status: number): ApiErrorBody {
  if (
    typeof payload === 'object' &&
    payload !== null &&
    'error' in payload &&
    typeof payload.error === 'object'
  ) {
    const error = (payload as { error: Partial<ApiErrorBody> }).error;
    return {
      code: error.code ?? 'ETN-SYS-500',
      message: error.message ?? 'Request failed.',
      requestId: error.requestId ?? 'unknown',
      ...(error.details !== undefined ? { details: error.details } : {}),
    };
  }
  return {
    code: 'ETN-SYS-500',
    message: 'Request failed.',
    requestId: 'unknown',
    details: { status },
  };
}

function unwrap<T>(payload: unknown): T {
  if (typeof payload === 'object' && payload !== null && 'data' in payload) {
    return (payload as ApiEnvelope<T>).data;
  }
  return payload as T;
}
