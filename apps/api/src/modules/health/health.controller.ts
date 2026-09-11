import type { HealthReport } from '@easytrip/contracts';
import { Controller, Get, Res } from '@nestjs/common';
import { PublicHealthRoute } from '../../common/decorators/health-public.decorator.js';
import { HealthService } from './health.service.js';

interface ResponseLike {
  status(code: number): unknown;
}

/**
 * Ops health surface (Arch §3.4, §15.2 — unversioned, alongside `/metrics`).
 *
 * - `GET /health` (alias `/healthz`) is **liveness**: it always answers and lists
 *   every dependency, so an operator can see *why* the platform is unhealthy.
 * - `GET /health/ready` (alias `/readyz`) is **readiness**: 503 when a required
 *   dependency is down, so an orchestrator stops routing traffic here.
 */
@Controller()
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @PublicHealthRoute()
  @Get(['health', 'healthz'])
  async liveness(): Promise<HealthReport> {
    return this.health.report();
  }

  @PublicHealthRoute()
  @Get(['health/ready', 'readyz'])
  async readiness(@Res({ passthrough: true }) res: ResponseLike): Promise<HealthReport> {
    const report = await this.health.report();
    // Degraded still serves traffic (Arch §17.3 degradation matrix); only a
    // required dependency being down removes the instance from rotation.
    if (report.status === 'down') res.status(503);
    return report;
  }
}
