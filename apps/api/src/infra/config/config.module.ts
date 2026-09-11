import { loadEnv, type Env } from '@easytrip/contracts';
import { type DynamicModule, Global, Module } from '@nestjs/common';
import { ENV_TOKEN } from './env.token.js';

/**
 * Configuration module (Arch §23 `infra/config`).
 *
 * Environment variables are validated **once**, at boot, by the shared Zod schema
 * in `@easytrip/contracts`. Anything invalid aborts startup rather than surfacing
 * as a runtime surprise (Arch §25.1 "fail fast").
 *
 * Runtime-tunable settings (commission, SLAs, feature flags) are *not* env — they
 * live in Postgres and arrive with the admin module (Arch §25.1).
 */
@Global()
@Module({})
export class ConfigModule {
  /** Register with an explicit env object (used by tests and the app factory). */
  static withEnv(env: Env): DynamicModule {
    return {
      module: ConfigModule,
      global: true,
      providers: [{ provide: ENV_TOKEN, useValue: env }],
      exports: [ENV_TOKEN],
    };
  }

  /** Register by reading and validating `process.env`. */
  static fromProcessEnv(): DynamicModule {
    return ConfigModule.withEnv(loadEnv());
  }
}
