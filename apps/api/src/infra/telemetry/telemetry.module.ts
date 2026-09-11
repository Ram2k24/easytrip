import { Global, Module } from '@nestjs/common';
import { MetricsInterceptor } from './metrics.interceptor.js';
import { MetricsRegistry } from './metrics.registry.js';
import { METRICS_REGISTRY } from './metrics.token.js';

export { METRICS_REGISTRY };

/** Telemetry module (Arch §15). OTLP export is env-gated and lands with the `obs` profile. */
@Global()
@Module({
  providers: [{ provide: METRICS_REGISTRY, useValue: new MetricsRegistry() }, MetricsInterceptor],
  exports: [METRICS_REGISTRY, MetricsInterceptor],
})
export class TelemetryModule {}
