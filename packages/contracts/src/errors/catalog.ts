/**
 * Stable error catalog — `ETN-{DOMAIN}-{NNN}` (Arch §17.1).
 *
 * The catalog lives in `packages/contracts` so the API (producer) and the web
 * app (consumer, error→UI mapping) share one source. Codes are additive only
 * within v1 (Arch §24).
 */
export interface ErrorCatalogEntry {
  readonly code: string;
  readonly httpStatus: number;
  /** User-safe default message; may be overridden per throw site. */
  readonly defaultMessage: string;
}

const entry = (code: string, httpStatus: number, defaultMessage: string): ErrorCatalogEntry => ({
  code,
  httpStatus,
  defaultMessage,
});

export const ERROR_CATALOG = {
  // Validation / request shape
  VAL_001: entry('ETN-VAL-001', 422, 'One or more fields failed validation.'),
  VAL_002: entry('ETN-VAL-002', 400, 'The request could not be parsed.'),

  // Authentication
  AUTH_101: entry('ETN-AUTH-101', 401, 'Your session has expired. Please sign in again.'),
  AUTH_102: entry('ETN-AUTH-102', 401, 'We could not verify your credentials.'),
  AUTH_103: entry('ETN-AUTH-103', 401, 'Multi-factor verification is required.'),
  // Phase 06 additions (additive within v1 — Arch §24).
  // 104 deliberately does not reveal whether the email exists on a *login*
  // attempt; it is only returned from registration, where the caller already
  // volunteered the address (Arch §5.3 no-enumeration applies to authentication).
  AUTH_104: entry('ETN-AUTH-104', 409, 'An account with that email already exists.'),
  AUTH_105: entry('ETN-AUTH-105', 403, 'Please verify your email address before continuing.'),
  AUTH_106: entry('ETN-AUTH-106', 403, 'This account is not active.'),
  AUTH_107: entry(
    'ETN-AUTH-107',
    400,
    'That link or code is no longer valid. Please request a new one.',
  ),
  AUTH_108: entry('ETN-AUTH-108', 422, 'That password does not meet our requirements.'),
  AUTH_109: entry(
    'ETN-AUTH-109',
    403,
    'Two-factor authentication must be set up before you can continue.',
  ),
  AUTH_110: entry('ETN-AUTH-110', 401, 'That verification code is not correct.'),
  AUTH_111: entry('ETN-AUTH-111', 401, 'Your current password is not correct.'),
  // Step-up: a privileged action needs a fresh MFA verification (Arch §6.6).
  AUTH_112: entry('ETN-AUTH-112', 403, 'Please re-verify your identity to perform this action.'),

  // Authorization (audited — PRD AR-2/AR-3)
  AUTHZ_101: entry('ETN-AUTHZ-101', 403, 'You do not have access to this resource.'),

  // Bookings
  BK_101: entry('ETN-BK-101', 409, 'That booking cannot make this change right now.'),
  BK_102: entry('ETN-BK-102', 422, 'The price you saw has expired. Please confirm the new price.'),
  BK_103: entry('ETN-BK-103', 409, 'Availability for those dates just changed.'),

  // Quotes / offers
  QT_101: entry('ETN-QT-101', 409, 'This offer has expired or been withdrawn.'),
  QT_102: entry('ETN-QT-102', 422, 'The offer revision limit has been reached.'),

  // Payments (backend-authoritative — GC-4)
  PY_101: entry('ETN-PY-101', 409, 'The amount no longer matches. Please review your booking.'),
  PY_102: entry('ETN-PY-102', 402, 'The payment could not be completed.'),
  PY_103: entry('ETN-PY-103', 409, 'The payment session expired. Please try again.'),
  PY_104: entry('ETN-PY-104', 502, 'The payment provider is unreachable. Please retry.'),

  // Refunds
  RF_101: entry('ETN-RF-101', 409, 'The refund exceeds the refundable balance.'),

  // Vendors
  VEN_101: entry('ETN-VEN-101', 403, 'This service line is not approved for the vendor.'),

  // Reviews
  REV_101: entry('ETN-REV-101', 403, 'You are not eligible to review this booking yet.'),

  // Corporate
  CORP_101: entry('ETN-CORP-101', 409, 'Internal approval is required before payment.'),

  // Uploads
  UP_101: entry('ETN-UP-101', 413, 'Upload quota exceeded.'),
  UP_102: entry('ETN-UP-102', 415, 'That file type or size is not accepted.'),

  // System (Arch §17.1). SYS_404 / SYS_429 are additive Phase 05 extensions.
  SYS_404: entry('ETN-SYS-404', 404, 'We could not find what you were looking for.'),
  SYS_429: entry('ETN-SYS-429', 429, 'Too many requests. Please slow down and try again.'),
  SYS_500: entry('ETN-SYS-500', 500, 'Something went wrong on our side.'),
  SYS_502: entry('ETN-SYS-502', 502, 'An upstream service did not respond correctly.'),
  SYS_503: entry('ETN-SYS-503', 503, 'The platform is temporarily unavailable.'),
} as const satisfies Record<string, ErrorCatalogEntry>;

export type ErrorCatalogKey = keyof typeof ERROR_CATALOG;
export type ErrorCode = (typeof ERROR_CATALOG)[ErrorCatalogKey]['code'];

/** All codes, for contract tests and client mapping tables. */
export const ERROR_CODES: readonly ErrorCode[] = Object.values(ERROR_CATALOG).map((e) => e.code);

/** Look up an entry by its wire code (`ETN-…`). Returns undefined when unknown. */
export function findCatalogEntryByCode(code: string): ErrorCatalogEntry | undefined {
  return Object.values(ERROR_CATALOG).find((e) => e.code === code);
}

/** Resolve the HTTP status for a catalog key, defaulting to 500. */
export function httpStatusForKey(key: ErrorCatalogKey): number {
  return ERROR_CATALOG[key].httpStatus;
}
