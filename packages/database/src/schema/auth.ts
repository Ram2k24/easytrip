import {
  boolean,
  customType,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createdAt } from './common.js';
import { user } from './user.js';

/** `bytea` — drizzle 0.45 has no built-in binary column type. */
export const bytea = customType<{ data: Buffer }>({
  dataType() {
    return 'bytea';
  },
});

/**
 * `auth_session.revoke_reason` (DB §4.7).
 *
 * `ROTATED` is added to the document's list deliberately and is load-bearing: the
 * table carries a partial unique index on `(family_id) WHERE revoked_at IS NULL`,
 * which only holds if rotation retires the superseded row instead of leaving two
 * active rows in one family. Retiring it is also what makes reuse detection
 * possible — a presented hash that exists but is already retired was replayed.
 */
export const REVOKE_REASONS = ['LOGOUT', 'REUSE_DETECTED', 'POLICY', 'ADMIN', 'ROTATED'] as const;
export type RevokeReason = (typeof REVOKE_REASONS)[number];

/**
 * `auth_session` — refresh-token families (DB §4.7, Arch §5.2).
 *
 * The raw refresh token is **never** stored: only its SHA-256 hash. A database
 * dump therefore cannot be replayed as a session.
 *
 * Rotation: each use retires the presented row (`ROTATED`) and inserts a new one in
 * the same family. Presenting an already-retired hash means the token was stolen or
 * copied, so the whole family is revoked and a security event is audited.
 */
export const authSession = pgTable(
  'auth_session',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    /** Opaque family id — the unit of reuse detection (Arch §5.2). */
    familyId: text('family_id').notNull(),
    /** SHA-256 of the opaque 256-bit token. Unique: one row per issued token. */
    refreshTokenHash: text('refresh_token_hash').notNull(),
    /** Coarse, privacy-safe device fingerprint. */
    deviceFingerprint: text('device_fingerprint'),
    ipHash: text('ip_hash'),
    userAgent: text('user_agent'),
    /**
     * Admin step-up (Arch §6.6): when TOTP was last verified on this session.
     * Privileged routes accept it only within `MFA_STEP_UP_WINDOW_S`.
     */
    mfaVerifiedAt: timestamp('mfa_verified_at', { withTimezone: true }),
    createdAt: createdAt(),
    /** Last successful rotation. */
    rotatedAt: timestamp('rotated_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    revokeReason: text('revoke_reason'),
  },
  (table) => [
    uniqueIndex('auth_session_token_hash_uq').on(table.refreshTokenHash),
    // Exactly one live row per family — see REVOKE_REASONS above.
    uniqueIndex('auth_session_family_active_uq')
      .on(table.familyId)
      .where(sql`${table.revokedAt} is null`),
    // Drives the max-active-families eviction (Arch §5.2: customer 5, admin 1).
    index('auth_session_user_created_idx').on(table.userId, table.createdAt),
    index('auth_session_family_idx').on(table.familyId),
    index('auth_session_expires_idx').on(table.expiresAt),
  ],
);

/** `mfa_enrollment.kind` (DB §4.8). TOTP only in MVP; WebAuthn would extend this. */
export const MFA_KINDS = ['TOTP'] as const;
export type MfaKind = (typeof MFA_KINDS)[number];

/**
 * `mfa_enrollment` — one TOTP enrollment per user (DB §4.8).
 *
 * `secret_enc` is AES-256-GCM ciphertext (DB-04/D-20), never the raw base32
 * secret: an attacker with database read access must still not be able to
 * generate valid codes. Encryption is performed in `apps/api/src/infra/crypto`.
 */
export const mfaEnrollment = pgTable(
  'mfa_enrollment',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull().default('TOTP'),
    secretEnc: bytea('secret_enc').notNull(),
    /** False until the user proves possession with a valid code. */
    verified: boolean('verified').notNull().default(false),
    /** Count of consecutive wrong codes, for lockout (Arch §5.3). */
    failedAttempts: integer('failed_attempts').notNull().default(0),
    createdAt: createdAt(),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    disabledAt: timestamp('disabled_at', { withTimezone: true }),
  },
  (table) => [
    // One active enrollment per user; a disabled one must not block re-enrollment.
    uniqueIndex('mfa_enrollment_user_active_uq')
      .on(table.userId)
      .where(sql`${table.disabledAt} is null`),
  ],
);

/** `otp_issue.purpose` (DB §4.9). `LOGIN` is `[V1.5]` phone OTP. */
export const OTP_PURPOSES = ['EMAIL_VERIFY', 'PASSWORD_RESET', 'LOGIN'] as const;
export type OtpPurpose = (typeof OTP_PURPOSES)[number];

/**
 * `otp_issue` — single-use one-time codes (DB §4.9, Arch §5.1).
 *
 * Append-only. Codes are stored hashed; `attempts` caps brute force so a 6-digit
 * code cannot be enumerated within its lifetime. `identifier_hash` is the
 * rate-limit key (3 per 15 min per identifier) and holds no plaintext email.
 */
export const otpIssue = pgTable(
  'otp_issue',
  {
    id: text('id').primaryKey(),
    purpose: text('purpose').notNull(),
    identifierHash: text('identifier_hash').notNull(),
    /** Hash of the 6-digit code — never the code itself. */
    codeHash: text('code_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    /** Single-use: set on first successful verification. */
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    attempts: integer('attempts').notNull().default(0),
    createdAt: createdAt(),
  },
  (table) => [
    // Backs the 3-per-15-minutes-per-identifier limit (Arch §5.1).
    index('otp_issue_identifier_created_idx').on(table.identifierHash, table.createdAt),
    index('otp_issue_purpose_idx').on(table.purpose),
  ],
);

/**
 * `auth_idp_account` — external identity links (DB §4.10, Arch §5.5).
 *
 * **Schema only in MVP.** Google OAuth and phone OTP are `[V1.5]`; the table ships
 * now so adding a provider later is a code change, not a migration. Nothing writes
 * to it yet, and no login path reads it.
 */
export const authIdpAccount = pgTable(
  'auth_idp_account',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    /** e.g. `google`. No provider is active in MVP. */
    provider: text('provider').notNull(),
    /** Provider-side subject id. */
    subject: text('subject').notNull(),
    linkedAt: timestamp('linked_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('auth_idp_provider_subject_uq').on(table.provider, table.subject),
    uniqueIndex('auth_idp_user_provider_uq').on(table.userId, table.provider),
  ],
);

export type AuthSessionRow = typeof authSession.$inferSelect;
export type NewAuthSessionRow = typeof authSession.$inferInsert;
export type MfaEnrollmentRow = typeof mfaEnrollment.$inferSelect;
export type OtpIssueRow = typeof otpIssue.$inferSelect;
export type AuthIdpAccountRow = typeof authIdpAccount.$inferSelect;
