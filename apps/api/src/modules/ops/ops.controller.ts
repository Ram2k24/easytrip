import type { Env } from '@easytrip/contracts';
import { Controller, Get, Inject, Res } from '@nestjs/common';
import { ENV_TOKEN } from '../../infra/config/env.token.js';
import { METRICS_REGISTRY } from '../../infra/telemetry/metrics.token.js';
import type { MetricsRegistry } from '../../infra/telemetry/metrics.registry.js';

interface RawResponse {
  setHeader(name: string, value: string): unknown;
  status(code: number): RawResponse;
  end(chunk: string): void;
}

/**
 * Unversioned ops surface (Arch §3.4): service identity and scrapeable metrics.
 * `/metrics` is intended to be network-restricted (Arch §15.1); in the compose
 * stack only the observability network can reach it.
 */
@Controller()
export class OpsController {
  constructor(
    @Inject(ENV_TOKEN) private readonly env: Env,
    @Inject(METRICS_REGISTRY) private readonly metrics: MetricsRegistry,
  ) {}

  @Get()
  root() {
    return {
      service: this.env.SERVICE_NAME,
      version: this.env.APP_VERSION,
      environment: this.env.APP_ENV,
      apiVersion: 'v1',
      endpoints: {
        health: 'GET /health',
        readiness: 'GET /readyz',
        metrics: 'GET /metrics',
      },
    };
  }

  /**
   * Prometheus text exposition format.
   *
   * Writes the response directly: this endpoint is deliberately **not** wrapped in
   * the JSON envelope, because a scraper parses the body as metrics text.
   */
  @Get('metrics')
  metricsEndpoint(@Res() res: RawResponse): void {
    this.metrics.set(
      'process_uptime_seconds',
      'Process uptime in seconds.',
      {},
      Math.round(process.uptime()),
    );
    this.metrics.set(
      'process_resident_memory_bytes',
      'Resident set size in bytes.',
      {},
      process.memoryUsage().rss,
    );
    res.setHeader('content-type', 'text/plain; version=0.0.4; charset=utf-8');
    res.status(200).end(this.metrics.render());
  }
}
