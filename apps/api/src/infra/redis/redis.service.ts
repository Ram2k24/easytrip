import type { Env } from '@easytrip/contracts';
import { Inject, Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { Redis } from 'ioredis';
import { ENV_TOKEN } from '../config/env.token.js';

export interface RedisProbe {
  ok: boolean;
  latencyMs: number;
  message?: string;
}

/**
 * Redis client (Arch §11): cache, rate limiting and BullMQ queues.
 *
 * Deliberately non-fatal when unreachable — Arch §17.3 degradation matrix says
 * "Redis down ⇒ degrade", not "API down". `enableOfflineQueue: false` makes
 * commands fail fast instead of silently queueing behind a dead server.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis | null = null;
  private connectError: string | null = null;

  constructor(@Inject(ENV_TOKEN) private readonly env: Env) {}

  async onModuleInit(): Promise<void> {
    const client = new Redis(this.env.REDIS_URL, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      keyPrefix: `${this.env.REDIS_PREFIX}:`,
      retryStrategy: (attempt: number) => (attempt > 5 ? null : Math.min(attempt * 250, 3_000)),
      reconnectOnError: () => false,
    });

    client.on('error', (error: Error) => {
      this.connectError = error.message;
    });
    client.on('ready', () => {
      this.connectError = null;
    });

    this.client = client;
    try {
      // Bounded: an unreachable cache degrades the API, it must not block boot.
      await Promise.race([
        client.connect(),
        new Promise<never>((_resolve, reject) => {
          const timer = setTimeout(
            () =>
              reject(
                new Error(
                  `redis connect timed out after ${String(this.env.REDIS_CONNECT_TIMEOUT_MS)}ms`,
                ),
              ),
            this.env.REDIS_CONNECT_TIMEOUT_MS,
          );
          timer.unref();
        }),
      ]);
      this.connectError = null;
    } catch (error) {
      this.connectError = error instanceof Error ? error.message : 'unknown redis error';
    }
  }

  /** True once a connection has been established and has not errored since. */
  get isConnected(): boolean {
    return this.client !== null && this.client.status === 'ready';
  }

  /** Round-trip PING used by the health check. Never throws. */
  async ping(): Promise<RedisProbe> {
    if (this.client === null) return { ok: false, latencyMs: 0, message: 'client not initialised' };
    const started = process.hrtime.bigint();
    try {
      const reply: string = await this.client.ping();
      const latencyMs = Math.round((Number(process.hrtime.bigint() - started) / 1e6) * 100) / 100;
      return reply === 'PONG'
        ? { ok: true, latencyMs }
        : { ok: false, latencyMs, message: `unexpected reply: ${reply}` };
    } catch (error) {
      const latencyMs = Math.round((Number(process.hrtime.bigint() - started) / 1e6) * 100) / 100;
      return {
        ok: false,
        latencyMs,
        message:
          this.connectError ?? (error instanceof Error ? error.message : 'unknown redis error'),
      };
    }
  }

  async onModuleDestroy(): Promise<void> {
    // Detach first: `quit()` can reject on a client that never connected, and the
    // fallback must not re-read a field another teardown may already have cleared.
    const client = this.client;
    if (client === null) return;
    this.client = null;
    try {
      await client.quit();
    } catch {
      client.disconnect();
    }
  }
}
