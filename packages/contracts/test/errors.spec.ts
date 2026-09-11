import { describe, expect, it } from 'vitest';
import {
  AppError,
  ERROR_CATALOG,
  ERROR_CODES,
  findCatalogEntryByCode,
  isAppError,
} from '../src/errors/index.js';
import { envelope, errorEnvelope, listEnvelope } from '../src/http/envelope.js';
import { makePage } from '../src/http/pagination.js';

describe('error catalog (Arch §17.1)', () => {
  it('uses the ETN-{DOMAIN}-{NNN} format for every code', () => {
    for (const code of ERROR_CODES) {
      expect(code).toMatch(/^ETN-[A-Z]+-\d{3}$/);
    }
  });

  it('has unique codes', () => {
    expect(new Set(ERROR_CODES).size).toBe(ERROR_CODES.length);
  });

  it('maps every entry to a plausible HTTP status', () => {
    for (const entry of Object.values(ERROR_CATALOG)) {
      expect(entry.httpStatus).toBeGreaterThanOrEqual(400);
      expect(entry.httpStatus).toBeLessThanOrEqual(599);
    }
  });

  it('finds entries by wire code', () => {
    expect(findCatalogEntryByCode('ETN-VAL-001')?.httpStatus).toBe(422);
    expect(findCatalogEntryByCode('ETN-NOPE-999')).toBeUndefined();
  });

  it('builds typed errors that carry code, status and details', () => {
    const error = new AppError('VAL_001', { details: { fields: { email: ['required'] } } });
    expect(error.code).toBe('ETN-VAL-001');
    expect(error.httpStatus).toBe(422);
    expect(error.details).toEqual({ fields: { email: ['required'] } });
    expect(isAppError(error)).toBe(true);
    expect(isAppError(new Error('x'))).toBe(false);
  });
});

describe('response envelope (Arch §3.3)', () => {
  it('wraps objects and lists', () => {
    expect(envelope({ a: 1 })).toEqual({ data: { a: 1 } });
    expect(listEnvelope([1, 2], makePage({ nextCursor: null, limit: 25, returned: 2 }))).toEqual({
      data: [1, 2],
      page: { nextCursor: null, limit: 25, returned: 2 },
    });
  });

  it('wraps errors with a requestId', () => {
    const body = errorEnvelope({
      code: 'ETN-SYS-500',
      message: 'Something went wrong on our side.',
      requestId: 'req_1',
    });
    expect(body.error.requestId).toBe('req_1');
  });
});
