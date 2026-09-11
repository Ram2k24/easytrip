import { customType, timestamp } from 'drizzle-orm/pg-core';

/**
 * `citext` — case-insensitive TEXT (DB §2 C-10, created in migration 0001).
 *
 * drizzle-orm 0.45 exports neither `citext` nor `pgExtension`, so the column type
 * is declared explicitly. Used for email so that uniqueness and lookups cannot be
 * defeated by casing (PRD CV-01 canonicalisation is enforced by the database, not
 * by every caller remembering to lowercase).
 */
export const citext = customType<{ data: string }>({
  dataType() {
    return 'citext';
  },
});

/** `created_at` — every table carries it (DB §2 C-2). Always `timestamptz` (C-4). */
export const createdAt = () =>
  timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

/**
 * `updated_at` — mutable tables only; append-only tables (audit_log, outbox,
 * otp_issue, user_verification_event) deliberately omit it (C-2).
 *
 * `$onUpdate` keeps the column correct even for writes that bypass the service
 * layer, so the value can never drift from the row's real modification time.
 */
export const updatedAt = () =>
  timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());
