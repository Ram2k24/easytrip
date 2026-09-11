import { loadEnv, type Env } from '@easytrip/contracts';
import { type DynamicModule, Module } from '@nestjs/common';
import { CoreModule } from './common/core.module.js';
import { ConfigModule } from './infra/config/config.module.js';
import { DbModule } from './infra/db/db.module.js';
import { LoggingModule } from './infra/logging/logger.module.js';
import { RedisModule } from './infra/redis/redis.module.js';
import { TelemetryModule } from './infra/telemetry/telemetry.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { OpsModule } from './modules/ops/ops.module.js';

/**
 * Application root (Arch §2.2 module system).
 *
 * Phase 05 wires **foundation only**: configuration, logging, database, Redis,
 * telemetry and the ops/health surface. Domain modules (auth, vendors, catalog,
 * bookings, payments, admin, …) are added in their own phases, each as a NestJS
 * module owning its table prefix (Arch BR-1).
 */
@Module({})
export class AppModule {
  static register(env: Env): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule.withEnv(env),
        CoreModule,
        LoggingModule,
        DbModule,
        RedisModule,
        TelemetryModule,
        HealthModule,
        OpsModule,
      ],
    };
  }

  static fromProcessEnv(): DynamicModule {
    return AppModule.register(loadEnv());
  }
}
