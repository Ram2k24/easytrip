import { index, pgTable, text, timestamp, uniqueIndex, varchar, char } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { citext, createdAt, updatedAt } from './common.js';
import { geoCountry } from './geo.js';

/** `user.status` (DB §3). Closed set; additions follow expand/contract (T-12). */
export const USER_STATUS = ['PENDING_VERIFICATION', 'ACTIVE', 'DEACTIVATED', 'BANNED'] as const;
export type UserStatus = (typeof USER_STATUS)[number];

/** `user.verification_level` (DB §3). PHONE/ID are `[V1.5]` but the column is sized for them. */
export const VERIFICATION_LEVELS = ['NONE', 'EMAIL', 'PHONE', 'ID'] as const;
export type VerificationLevel = (typeof VERIFICATION_LEVELS)[number];

/**
 * `user` — the single identity table for every human actor (DB §4.1, decision D-1).
 *
 * Customers, vendor team members and platform staff all live here. Role is *not*
 * a column: it is an M:N relation through `user_role`, so one person can hold
 * several roles (e.g. a vendor owner who is also a customer).
 */
export const user = pgTable(
  'user',
  {
    /** ULID (C-1). */
    id: text('id').primaryKey(),
    /**
     * `citext`, unique. The database enforces case-insensitive uniqueness so a
     * second registration with different casing fails at commit (PRD CV-01).
     */
    email: citext('email').notNull(),
    /** E.164 including country code (GC-1). Nullable: MVP is email-first. */
    phone: varchar('phone', { length: 20 }),
    countryId: text('country_id').references(() => geoCountry.id, { onDelete: 'restrict' }),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    /**
     * Argon2id hash (decision E-5). Nullable only for accounts that authenticate
     * through an IdP or OTP alone `[V1.5]`; MVP email+password accounts always
     * have one. Never returned by any API response.
     */
    passwordHash: text('password_hash'),
    status: text('status').notNull().default('PENDING_VERIFICATION'),
    verificationLevel: text('verification_level').notNull().default('NONE'),
    /** Display preference, ISO 4217 (D-6). Not a money column. */
    preferredCurrency: char('preferred_currency', { length: 3 }).notNull().default('NPR'),
    preferredLocale: varchar('preferred_locale', { length: 10 }).notNull().default('en'),
    /** IANA name; NULL means "use the device's zone" (Arch §14.1 TZ_DEFAULT). */
    timezone: text('timezone'),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    /** Set together with `status = 'BANNED'`; the reason is auditable, never deleted. */
    bannedReason: text('banned_reason'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('user_email_uq').on(table.email),
    // Partial: most rows have no phone, and NULLs must not collide (DB §4.1).
    uniqueIndex('user_phone_uq')
      .on(table.phone)
      .where(sql`${table.phone} is not null`),
    index('user_status_idx').on(table.status),
    index('user_created_at_idx').on(table.createdAt),
  ],
);

/** `user_verification_event.state` (DB §4.2). */
export const VERIFICATION_EVENT_STATES = ['PENDING', 'SUCCESS', 'FAILED', 'EXPIRED'] as const;
export type VerificationEventState = (typeof VERIFICATION_EVENT_STATES)[number];

/** `user_verification_event.kind` (DB §4.2). PHONE/ID are `[V1.5]`. */
export const VERIFICATION_EVENT_KINDS = ['EMAIL_VERIFY', 'PHONE_VERIFY', 'ID_VERIFY'] as const;
export type VerificationEventKind = (typeof VERIFICATION_EVENT_KINDS)[number];

/**
 * `user_verification_event` — append-only log of verification attempts (DB §4.2).
 *
 * Distinct from `otp_issue`: this records the *outcome* per user for audit and
 * support, while `otp_issue` holds the consumable codes themselves.
 */
export const userVerificationEvent = pgTable(
  'user_verification_event',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    state: text('state').notNull().default('PENDING'),
    /** Single-use tokens are stored hashed only (Arch §5.4). */
    tokenHash: text('token_hash'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    /** Salted hash — a raw IP is PII and must not be stored (DB-04). */
    ipHash: text('ip_hash'),
    createdAt: createdAt(),
  },
  (table) => [index('user_verification_event_user_idx').on(table.userId, table.createdAt)],
);

export type UserRow = typeof user.$inferSelect;
export type NewUserRow = typeof user.$inferInsert;
export type UserVerificationEventRow = typeof userVerificationEvent.$inferSelect;
