import { ERROR_CATALOG } from '@easytrip/contracts';
import { type ArgumentsHost, BadRequestException, NotFoundException } from '@nestjs/common';
import { ZodError, z } from 'zod';
import { ContractError } from '../../src/common/errors/contract.error';
import {
  AllExceptionsFilter,
  type ExceptionLogger,
} from '../../src/common/filters/all-exceptions.filter';

interface Harness {
  host: ArgumentsHost;
  json: jest.Mock;
  status: jest.Mock;
  setHeader: jest.Mock;
}

function harness(requestOverrides: Record<string, unknown> = {}): Harness {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const setHeader = jest.fn();
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status, json, setHeader }),
      getRequest: () => ({
        id: 'req_test',
        method: 'GET',
        url: '/v1/things',
        headers: {},
        ...requestOverrides,
      }),
    }),
  } as unknown as ArgumentsHost;
  return { host, json, status, setHeader };
}

const quietLogger: ExceptionLogger = { error: jest.fn(), warn: jest.fn() };

describe('AllExceptionsFilter (Arch §17.2)', () => {
  beforeEach(() => {
    jest.mocked(quietLogger.error).mockClear();
    jest.mocked(quietLogger.warn).mockClear();
  });

  it('emits the contract envelope with a requestId for typed errors', () => {
    const { host, json, status } = harness();
    new AllExceptionsFilter(quietLogger).catch(new ContractError('AUTHZ_101'), host);

    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({
      error: {
        code: 'ETN-AUTHZ-101',
        message: ERROR_CATALOG.AUTHZ_101.defaultMessage,
        requestId: 'req_test',
      },
    });
  });

  it('preserves field-level validation details', () => {
    const { host, json } = harness();
    new AllExceptionsFilter(quietLogger).catch(
      new ContractError('VAL_001', { details: { fields: { email: ['required'] } } }),
      host,
    );

    const body = (json.mock.calls[0]?.[0] as { error: { details: { fields: unknown } } }).error;
    expect(body.details.fields).toEqual({ email: ['required'] });
  });

  it('maps a raw ZodError onto ETN-VAL-001 with a field map', () => {
    const { host, json, status } = harness();
    const error = z.object({ email: z.string() }).safeParse({});
    if (error.success) throw new Error('expected validation to fail');

    new AllExceptionsFilter(quietLogger).catch(new ZodError(error.error.issues), host);

    expect(status).toHaveBeenCalledWith(422);
    const body = json.mock.calls[0]?.[0] as {
      error: { code: string; details: { fields: Record<string, string[]> } };
    };
    expect(body.error.code).toBe('ETN-VAL-001');
    expect(Object.keys(body.error.details.fields)).toContain('email');
  });

  it('maps framework exceptions onto catalog codes', () => {
    const { host, json, status } = harness();
    new AllExceptionsFilter(quietLogger).catch(new NotFoundException('Vendor not found'), host);
    expect(status).toHaveBeenCalledWith(404);
    expect((json.mock.calls[0]?.[0] as { error: { code: string } }).error.code).toBe('ETN-SYS-404');

    new AllExceptionsFilter(quietLogger).catch(new BadRequestException(), host);
    expect((json.mock.calls[1]?.[0] as { error: { code: string } }).error.code).toBe('ETN-VAL-002');
  });

  it('never leaks internals for unknown failures', () => {
    const { host, json, status } = harness();
    new AllExceptionsFilter(quietLogger).catch(
      new Error('connection string: postgres://secret'),
      host,
    );

    expect(status).toHaveBeenCalledWith(500);
    const body = json.mock.calls[0]?.[0] as { error: { code: string; message: string } };
    expect(body.error.code).toBe('ETN-SYS-500');
    expect(body.error.message).not.toContain('postgres://');
    expect(quietLogger.error).toHaveBeenCalled();
  });

  it('falls back to "unknown" when no request id is available', () => {
    const { host, json } = harness({ id: undefined, headers: {} });
    new AllExceptionsFilter(quietLogger).catch(new ContractError('SYS_503'), host);
    expect((json.mock.calls[0]?.[0] as { error: { requestId: string } }).error.requestId).toBe(
      'unknown',
    );
  });

  it('echoes the requestId on the response header', () => {
    const { host, setHeader } = harness();
    new AllExceptionsFilter(quietLogger).catch(new ContractError('SYS_404'), host);
    expect(setHeader).toHaveBeenCalledWith('x-request-id', 'req_test');
  });
});
