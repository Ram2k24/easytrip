import { index, integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { createdAt } from './common.js';

/** `audit.actor_type` (DB §3). */
export const AUDIT_ACTOR_TYPES = ['USER', 'ADMIN', 'SYSTEM', 'PROVIDER', 'VENDOR'] as const;
export type AuditActorType = (typeof AUDIT_ACTOR_TYPES)[number];

/**
 * `audit_log` — append-only audit trail (DB §4.11, DB-05, AZ-05).
 *
 * No `updated_at`, and no UPDATE/DELETE is granted on it in production (D-16).
 * Every security-relevant authentication event and every admin action writes a row
 * here; the row is the evidence, so it is written in the same transaction as the
 * change it records.
 *
 * `before_hash`/`after_hash` are SHA-256 digests rather than payloads so the log
 * can prove *that* a value changed without duplicating PII (DB-04).
 */
export const auditLog = pgTable(
  'audit_log',
  {
    id: text('id').primaryKey(),
    actorType: text('actor_type').notNull(),
    /** NULL for system/provider actors. */
    actorId: text('actor_id'),
    /** Role held at the moment of the action, not the actor's current role. */
    roleCode: text('role_code'),
    /** e.g. `auth.login.success`, `vendor.approve`, `settings.update`. */
    action: text('action').notNull(),
    entityType: text('entity_type'),
    entityId: text('entity_id'),
    beforeHash: text('before_hash'),
    afterHash: text('after_hash'),
    /** Non-PII context only (reason codes, counts, ids). */
    meta: jsonb('meta'),
    ipHash: text('ip_hash'),
    /** Append-only timestamp (C-2). */
    createdAt: createdAt(),
  },
  (table) => [
    index('audit_log_actor_created_idx').on(table.actorId, table.createdAt),
    index('audit_log_entity_idx').on(table.entityType, table.entityId, table.createdAt),
    index('audit_log_action_idx').on(table.action),
    index('audit_log_actor_type_idx').on(table.actorType),
    // DB §4.11 also specifies BRIN(created_at); drizzle-kit cannot emit BRIN, so
    // it is added by a follow-up hand-written migration once volume justifies it.
  ],
);

/**
 * `idempotency_key` — safe retries for non-idempotent commands (DB §4.12, Arch §3.6).
 *
 * `key_hash` is SHA-256(scope + key). `request_hash` makes a replayed key with a
 * *different* body a 422 rather than a silent replay of the original response.
 */
export const idempotencyKey = pgTable(
  'idempotency_key',
  {
    id: text('id').primaryKey(),
    keyHash: text('key_hash').notNull(),
    /** NULL when the caller is anonymous (scope `anon`). */
    scopeUserId: text('scope_user_id'),
    requestHash: text('request_hash').notNull(),
    responseStatus: integer('response_status'),
    /** Replayed verbatim on a retry. */
    responseBody: jsonb('response_body'),
    createdAt: createdAt(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    index('idempotency_key_hash_uq').on(table.keyHash),
    index('idempotency_key_expires_idx').on(table.expiresAt),
    index('idempotency_key_scope_idx').on(table.scopeUserId),
  ],
);

export type AuditLogRow = typeof auditLog.$inferSelect;
export type NewAuditLogRow = typeof auditLog.$inferInsert;
export type IdempotencyKeyRow = typeof idempotencyKey.$inferSelect;
