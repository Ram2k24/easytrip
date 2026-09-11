import {
  CorrelationIdMiddleware,
  type CorrelationRequest,
  type CorrelationResponse,
} from '../../src/common/middleware/correlation.middleware';
import { resolveRequestId } from '../../src/common/context/request-context';

describe('CorrelationIdMiddleware', () => {
  const request = (headers: Record<string, string>): CorrelationRequest => ({ headers });
  const response = (): CorrelationResponse & { setHeader: jest.Mock } => ({ setHeader: jest.fn() });

  it('generates a ULID-backed id when the caller sends none', () => {
    const req = request({});
    const res = response();
    const next = jest.fn();

    new CorrelationIdMiddleware().use(req, res, next);

    expect(req.id).toMatch(/^req_[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', req.id);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('honours an inbound x-request-id so caller correlation survives', () => {
    const req = request({ 'x-request-id': 'caller-trace-42' });
    const res = response();

    new CorrelationIdMiddleware().use(req, res, jest.fn());

    expect(req.id).toBe('caller-trace-42');
  });

  it('rejects oversized inbound ids and mints its own', () => {
    expect(resolveRequestId('x'.repeat(200))).toMatch(/^req_/);
    expect(resolveRequestId(['first', 'second'])).toBe('first');
    expect(resolveRequestId(undefined)).toMatch(/^req_/);
  });
});
