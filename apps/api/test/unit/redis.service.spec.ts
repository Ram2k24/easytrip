import { loadEnv } from '@easytrip/contracts';
import { RedisService } from '../../src/infra/redis/redis.service';

const env = loadEnv({
  APP_ENV: 'test',
  DATABASE_URL: 'postgresql://easytrip:easytrip@127.0.0.1:5432/easytrip_test',
  REDIS_URL: 'redis://127.0.0.1:6390',
  REDIS_CONNECT_TIMEOUT_MS: '200',
});

interface FakeClient {
  quit: jest.Mock;
  disconnect: jest.Mock;
}

function serviceWithClient(client: FakeClient): RedisService {
  const service = new RedisService(env);
  (service as unknown as { client: FakeClient | null }).client = client;
  return service;
}

describe('RedisService teardown (Arch §15.2 graceful shutdown)', () => {
  it('falls back to disconnect() when quit() rejects', async () => {
    const client: FakeClient = {
      quit: jest.fn(() => Promise.reject(new Error('Connection is closed.'))),
      disconnect: jest.fn(),
    };

    await expect(serviceWithClient(client).onModuleDestroy()).resolves.toBeUndefined();
    expect(client.quit).toHaveBeenCalledTimes(1);
    expect(client.disconnect).toHaveBeenCalledTimes(1);
  });

  it('is safe to call twice (Nest may tear down more than once)', async () => {
    const client: FakeClient = {
      quit: jest.fn(() => Promise.resolve('OK')),
      disconnect: jest.fn(),
    };
    const service = serviceWithClient(client);

    await service.onModuleDestroy();
    await expect(service.onModuleDestroy()).resolves.toBeUndefined();

    expect(client.quit).toHaveBeenCalledTimes(1);
  });

  it('is safe when the client was never initialised', async () => {
    await expect(new RedisService(env).onModuleDestroy()).resolves.toBeUndefined();
  });

  it('reports down without throwing when redis is unreachable', async () => {
    const service = new RedisService(env);
    const probe = await service.ping();
    expect(probe.ok).toBe(false);
    expect(service.isConnected).toBe(false);
  });
});
