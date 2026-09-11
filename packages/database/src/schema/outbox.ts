import { index, integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * `outbox` — transactional outbox (Arch §12.4, DB §4.13, foundation/events L0).
 *
 * Every domain state change that emits an event writes a row here **in the same
 * transaction** as the state change (DB convention C-14). A dispatcher publishes
 * unpublished rows to the in-process bus and BullMQ queues.
 *
 * Append-only: `created_at` only, no `updated_at` (DB convention C-2).
 */
export const outbox = pgTable(
  'outbox',
  {
    /** ULID (DB convention C-1). */
    id: text('id').primaryKey(),
    aggregateType: text('aggregate_type').notNull(),
    aggregateId: text('aggregate_id').notNull(),
    eventType: text('event_type').notNull(),
    payload: jsonb('payload').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    /** Set by the dispatcher once the event has been handed off. */
    publishedAt: timestamp('published_at', { withTimezone: true }),
    attempt: integer('attempt').notNull().default(0),
    lastError: text('last_error'),
  },
  (table) => [
    index('outbox_aggregate_created_idx').on(
      table.aggregateType,
      table.aggregateId,
      table.createdAt,
    ),
    index('outbox_event_type_idx').on(table.eventType),
    // Partial index for the dispatcher scan (DB §4.13).
    index('outbox_unpublished_idx')
      .on(table.createdAt)
      .where(sql`${table.publishedAt} is null`),
  ],
);

export type OutboxRow = typeof outbox.$inferSelect;
export type NewOutboxRow = typeof outbox.$inferInsert;
