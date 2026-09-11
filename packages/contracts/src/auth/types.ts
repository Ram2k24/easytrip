/**
 * Auth-domain types shared by the API and the web app.
 *
 * Kept separate from the Zod schemas so non-request types (enums mirrored from the
 * database, session state) have a home without pulling `zod` into every consumer.
 */

/** Mirrors `user.verification_level` (DB §3). */
export const VERIFICATION_LEVELS = ['NONE', 'EMAIL', 'PHONE', 'ID'] as const;
export type VerificationLevel = (typeof VERIFICATION_LEVELS)[number];

/** Mirrors `user.status` (DB §3). */
export const USER_STATUSES = ['PENDING_VERIFICATION', 'ACTIVE', 'DEACTIVATED', 'BANNED'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

/**
 * Authentication events written to `audit_log`.
 *
 * Named as a closed catalog rather than free-form strings so the audit log can be
 * queried and alerted on, and so a typo cannot create a phantom event type.
 */
export const AUTH_AUDIT_ACTIONS = [
  'auth.register',
  'auth.register.duplicate',
  'auth.login.success',
  'auth.login.failed',
  'auth.login.locked',
  'auth.login.mfa_required',
  'auth.logout',
  'auth.logout.all',
  'auth.session.rotated',
  'auth.session.reuse_detected',
  'auth.session.revoked',
  'auth.password.reset.requested',
  'auth.password.reset.completed',
  'auth.password.changed',
  'auth.email.verification.sent',
  'auth.email.verified',
  'auth.email.verification.failed',
  'auth.mfa.enrolled',
  'auth.mfa.verified',
  'auth.mfa.failed',
  'auth.mfa.disabled',
  'auth.authorize.denied',
  'vendor.register',
  'vendor.profile.updated',
  'vendor.approved',
  'vendor.rejected',
  'vendor.suspended',
  'vendor.reinstated',
] as const;

export type AuthAuditAction = (typeof AUTH_AUDIT_ACTIONS)[number];

/**
 * Cookie names.
 *
 * One refresh cookie for the whole app (Arch §5.2). The access token is never
 * stored in a cookie: the client keeps it in memory and the server renders RSC
 * data with a short-lived, server-derived token.
 */
export const REFRESH_COOKIE = 'etn_rt';

/** Cookie attributes for the refresh token (Arch §5.2). */
export const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  path: '/',
} as const;
