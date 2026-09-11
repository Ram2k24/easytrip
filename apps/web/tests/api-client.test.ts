import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError, createApiClient } from '@/lib/api/client';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

afterEach(() => {
  fetchMock.mockReset();
});

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

describe('api client (Arch §1.3, §3.3)', () => {
  it('unwraps the success envelope', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { data: { status: 'ok' } }));
    await expect(
      createApiClient('http://api.test/').get<{ status: string }>('/health'),
    ).resolves.toEqual({
      status: 'ok',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/health',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('converts an error envelope into a typed error carrying code and requestId', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(403, {
        error: {
          code: 'ETN-AUTHZ-101',
          message: 'You do not have access to this resource.',
          requestId: 'req_9',
        },
      }),
    );

    const error = await createApiClient('http://api.test')
      .get('/v1/admin/vendors')
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiClientError);
    const typed = error as ApiClientError;
    expect(typed.code).toBe('ETN-AUTHZ-101');
    expect(typed.status).toBe(403);
    expect(typed.requestId).toBe('req_9');
  });

  it('survives a non-JSON error body', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 502,
      json: async () => {
        throw new Error('not json');
      },
    } as unknown as Response);

    const error = (await createApiClient('http://api.test')
      .get('/health')
      .catch((e: unknown) => e)) as ApiClientError;
    expect(error).toBeInstanceOf(ApiClientError);
    expect(error.status).toBe(502);
    expect(error.code).toBe('ETN-SYS-500');
  });

  it('forwards a correlation id when supplied', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { data: null }));
    await createApiClient('http://api.test').get('/health', { requestId: 'req_trace_1' });
    const init = fetchMock.mock.calls[0]?.[1] as { headers: Record<string, string> };
    expect(init.headers['x-request-id']).toBe('req_trace_1');
  });
});
