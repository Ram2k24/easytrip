import { newId } from '@easytrip/contracts';

/** Header used to correlate a request across services and in support tickets (Phase 02 ER-01). */
export const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Resolve (or mint) a request id.
 *
 * An inbound `x-request-id` is honoured so a caller's own correlation id survives;
 * otherwise a ULID is generated. The value is echoed on the response and used as
 * `requestId` in every error envelope (Arch §3.3).
 */
export function resolveRequestId(incoming: string | string[] | undefined): string {
  const candidate = Array.isArray(incoming) ? incoming[0] : incoming;
  if (candidate && candidate.length > 0 && candidate.length <= 128) return candidate;
  return `req_${newId()}`;
}
