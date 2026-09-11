import { type CallHandler, type ExecutionContext } from '@nestjs/common';
import { firstValueFrom, of } from 'rxjs';
import { EnvelopeInterceptor } from '../../src/common/interceptors/envelope.interceptor';

describe('EnvelopeInterceptor (Arch §3.3)', () => {
  const context = {} as ExecutionContext;

  it('wraps handler results in { data }', async () => {
    const next = { handle: () => of({ id: '1' }) } as unknown as CallHandler<{ id: string }>;
    await expect(
      firstValueFrom(new EnvelopeInterceptor<{ id: string }>().intercept(context, next)),
    ).resolves.toEqual({
      data: { id: '1' },
    });
  });

  it('wraps list results without reshaping them', async () => {
    const payload = { data: [1, 2, 3], page: { nextCursor: null, limit: 25, returned: 3 } };
    const next = { handle: () => of(payload) } as unknown as CallHandler<typeof payload>;
    await expect(
      firstValueFrom(new EnvelopeInterceptor<typeof payload>().intercept(context, next)),
    ).resolves.toEqual({
      data: payload,
    });
  });
});
