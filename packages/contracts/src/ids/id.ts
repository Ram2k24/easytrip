import { ulid } from 'ulid';

/**
 * Identifiers are ULIDs (DB convention C-1): `TEXT` primary keys, app-generated,
 * lexicographically sortable, which keeps cursor pagination stable.
 */
export type EntityId = string;

const ULID_PATTERN = /^[0-9A-HJKMNP-TV-Z]{26}$/;

/** Generate a new ULID. Optionally pass a timestamp for deterministic tests. */
export function newId(seedTime?: number): EntityId {
  return seedTime === undefined ? ulid() : ulid(seedTime);
}

/** Validate an identifier's shape without touching the database. */
export function isEntityId(value: unknown): value is EntityId {
  return typeof value === 'string' && ULID_PATTERN.test(value);
}
