import {
  deriveHealthStatus,
  type HealthCheck,
  type HealthReport,
  type Env,
} from '@easytrip/contracts';
import { assertSchemaReady, probeDatabase, type DbClient } from '@easytrip/database';
import { Inject, Injectable } from '@nestjs/common';
import { DB_CLIENT } from '../../infra/db/db.module.js';
import { ENV_TOKEN } from '../../infra/config/env.token.js';
import { RedisService } from '../../infra/redis/redis.service.js';

/**
 * Health/readiness reporting (Arch §15.2).
 *
 * The database check is a real round-trip (`select version()`) **plus** an
 * assertion that the expected tables exist, so a green check means the schema is
 * usable — not merely that a TCP socket opened.
 */
@Injectable()
export class HealthService {
  constructor(
    @Inject(DB_CLIENT) private readonly dbClient: DbClient,
    @Inject(ENV_TOKEN) private readonly env: Env,
    private readonly redis: RedisService,
  ) {}

  async report(): Promise<HealthReport> {
    const checks: HealthCheck[] = [await this.databaseCheck(), await this.redisCheck()];
    const required = ['database', ...(this.env.REDIS_REQUIRED ? ['redis'] : [])];

    return {
      status: deriveHealthStatus(checks, required),
      service: this.env.SERVICE_NAME,
      version: this.env.APP_VERSION,
      environment: this.env.APP_ENV,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime() * 100) / 100,
      checks,
    };
  }

  private async databaseCheck(): Promise<HealthCheck> {
    const probe = await probeDatabase(this.dbClient);
    if (!probe.ok) {
      return {
        name: 'database',
        state: 'down',
        latencyMs: probe.latencyMs,
        message: probe.message ?? 'unreachable',
      };
    }

    const missing = await assertSchemaReady(this.dbClient, this.env.DB_SCHEMA_TABLES);
    if (missing.length > 0) {
      return {
        name: 'database',
        state: 'degraded',
        latencyMs: probe.latencyMs,
        message: `connected but migrations pending: ${missing.join(', ')}`,
      };
    }

    const version = probe.version ?? 'unknown';
    return { name: 'database', state: 'up', latencyMs: probe.latencyMs, message: version };
  }

  private async redisCheck(): Promise<HealthCheck> {
    const probe = await this.redis.ping();
    return {
      name: 'redis',
      state: probe.ok ? 'up' : 'down',
      latencyMs: probe.latencyMs,
      message: probe.ok ? undefined : (probe.message ?? 'unreachable'),
    };
  }
}
