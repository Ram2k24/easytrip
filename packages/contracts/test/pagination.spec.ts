import { describe, expect, it } from 'vitest';
import {
  decodeCursor,
  DEFAULT_PAGE_LIMIT,
  encodeCursor,
  makePage,
  MAX_PAGE_LIMIT,
} from '../src/http/pagination.js';
import { createListQuerySchema, parseSortDirective } from '../src/http/list-query.js';

describe('cursor pagination (Arch §3.6)', () => {
  it('round-trips a cursor payload through an opaque, url-safe string', () => {
    const cursor = encodeCursor({
      v: '2026-09-11T00:00:00.000Z',
      id: '01J0TESTTESTTESTTESTTESTTEST',
    });
    expect(cursor).toMatch(/^etc1:[A-Za-z0-9_-]+$/);
    expect(decodeCursor(cursor)).toEqual({
      v: '2026-09-11T00:00:00.000Z',
      id: '01J0TESTTESTTESTTESTTESTTEST',
    });
  });

  it('returns null for absent or malformed cursors rather than throwing', () => {
    expect(decodeCursor(null)).toBeNull();
    expect(decodeCursor(undefined)).toBeNull();
    expect(decodeCursor('')).toBeNull();
    expect(decodeCursor('nope')).toBeNull();
    expect(decodeCursor('etc1:not-base64-json')).toBeNull();
  });

  it('builds a page descriptor and omits total when unknown', () => {
    expect(makePage({ nextCursor: null, limit: 25, returned: 3 })).toEqual({
      nextCursor: null,
      limit: 25,
      returned: 3,
    });
    expect(makePage({ nextCursor: 'c', limit: 10, returned: 10, total: 42 }).total).toBe(42);
  });

  it('exposes the documented limits', () => {
    expect(DEFAULT_PAGE_LIMIT).toBe(25);
    expect(MAX_PAGE_LIMIT).toBe(100);
  });
});

describe('list query contract', () => {
  const schema = createListQuerySchema(['createdAt', 'name'] as const, '-createdAt');

  it('applies documented defaults', () => {
    const parsed = schema.parse({});
    expect(parsed.limit).toBe(DEFAULT_PAGE_LIMIT);
    expect(parsed.sort).toBe('-createdAt');
    expect(parsed.cursor).toBeUndefined();
  });

  it('accepts ascending and descending sort directives', () => {
    expect(parseSortDirective('-createdAt')).toEqual({ field: 'createdAt', direction: 'desc' });
    expect(parseSortDirective('name')).toEqual({ field: 'name', direction: 'asc' });
    expect(parseSortDirective('-')).toBeNull();
  });

  it('rejects unknown sort fields and oversized limits', () => {
    expect(schema.safeParse({ sort: 'password' }).success).toBe(false);
    expect(schema.safeParse({ limit: 101 }).success).toBe(false);
    expect(schema.safeParse({ limit: 0 }).success).toBe(false);
  });

  it('coerces string query values (query strings are always strings)', () => {
    expect(schema.parse({ limit: '50' }).limit).toBe(50);
  });
});
