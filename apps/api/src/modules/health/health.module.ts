import { Module } from '@nestjs/common';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';

/** Health module — liveness, readiness and dependency probes (Arch §15.2). */
@Module({ controllers: [HealthController], providers: [HealthService] })
export class HealthModule {}
