import { afterAll, describe, expect, it } from 'vitest';
import { createDbClient } from '../src/client.js';

describe('createDbClient close() (Arch §15.2 graceful shutdown)', () => {
  // Never connects: pool.end() resolves without a live server when no client
  // was ever checked out, so this exercises the teardown path alone.
  const client = createDbClient({
    connectionString: 'postgresql://easytrip:easytrip@127.0.0.1:55999/easytrip_test',
  });

  afterAll(async () => {
    await client.close();
  });

  it('is idempotent — a second close() must not throw', async () => {
    await expect(client.close()).resolves.toBeUndefined();
    // pg.Pool.end() rejects with "Called end on pool more than once" if the
    // guard is ever removed.
    await expect(client.close()).resolves.toBeUndefined();
  });

  it('resolves concurrent close() calls to the same teardown', async () => {
    const [a, b] = await Promise.all([client.close(), client.close()]);
    expect(a).toBeUndefined();
    expect(b).toBeUndefined();
  });
});
