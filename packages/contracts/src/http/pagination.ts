import { z } from 'zod';

/**
 * Cursor pagination (Arch §3.6 — "no offset APIs in v1").
 *
 * Cursors are opaque base64url blobs so the sort key can change without clients
 * caring. Decoding is defensive: a malformed cursor is reported, never thrown at
 * the caller as a 500.
 */
export const DEFAULT_PAGE_LIMIT = 25;
export const MAX_PAGE_LIMIT = 100;

export const PageSchema = z.object({
  /** Opaque cursor for the next page, or null when the result set is exhausted. */
  nextCursor: z.string().nullable(),
  /** Echo of the effective page size. */
  limit: z.number().int().positive(),
  /** Number of rows actually returned. */
  returned: z.number().int().nonnegative(),
  /** Present when the caller asked for a total and the backend supplied one. */
  total: z.number().int().nonnegative().nullish(),
});
export type Page = z.infer<typeof PageSchema>;

export function makePage(params: {
  nextCursor: string | null;
  limit: number;
  returned: number;
  total?: number | null;
}): Page {
  return {
    nextCursor: params.nextCursor,
    limit: params.limit,
    returned: params.returned,
    ...(params.total === undefined || params.total === null ? {} : { total: params.total }),
  };
}

export interface CursorPayload {
  /** Sort key value (ISO timestamp, id, …). */
  v: string;
  /** Tiebreaker, normally the row id. */
  id: string;
}

const CURSOR_PREFIX = 'etc1:';

function toBase64Url(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function fromBase64Url(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8');
}

/** Encode a cursor. Stable, URL-safe and versioned by prefix. */
export function encodeCursor(payload: CursorPayload): string {
  return `${CURSOR_PREFIX}${toBase64Url(JSON.stringify(payload))}`;
}

/** Decode a cursor. Returns null when the value is absent or malformed. */
export function decodeCursor(cursor: string | null | undefined): CursorPayload | null {
  if (!cursor) return null;
  if (!cursor.startsWith(CURSOR_PREFIX)) return null;
  try {
    const parsed: unknown = JSON.parse(fromBase64Url(cursor.slice(CURSOR_PREFIX.length)));
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof (parsed as CursorPayload).v !== 'string' ||
      typeof (parsed as CursorPayload).id !== 'string'
    ) {
      return null;
    }
    return { v: (parsed as CursorPayload).v, id: (parsed as CursorPayload).id };
  } catch {
    return null;
  }
}
