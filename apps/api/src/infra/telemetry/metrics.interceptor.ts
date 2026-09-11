import {
  Inject,
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { type Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { METRICS_REGISTRY } from './metrics.token.js';
import type { MetricsRegistry } from './metrics.registry.js';

interface HttpRequestLike {
  method?: string;
  url?: string;
}

interface HttpResponseLike {
  statusCode?: number;
}

/** Counts requests by method, route and status (feeds `GET /metrics`). */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(@Inject(METRICS_REGISTRY) private readonly metrics: MetricsRegistry) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const request = context.switchToHttp().getRequest<HttpRequestLike>();
    const started = process.hrtime.bigint();

    return next.handle().pipe(
      tap({
        next: () => this.record(request, context, 200, started),
        error: (error: unknown) => {
          const status =
            typeof error === 'object' && error !== null && 'getStatus' in error
              ? Number((error as { getStatus: () => number }).getStatus())
              : 500;
          this.record(request, context, status, started);
        },
      }),
    );
  }

  private record(
    request: HttpRequestLike,
    context: ExecutionContext,
    fallbackStatus: number,
    started: bigint,
  ): void {
    const response = context.switchToHttp().getResponse<HttpResponseLike>();
    const status = response?.statusCode ?? fallbackStatus;
    const durationMs = Math.round((Number(process.hrtime.bigint() - started) / 1e6) * 100) / 100;
    const labels = {
      method: request?.method ?? 'UNKNOWN',
      route: request?.url ?? 'unknown',
      status,
    };
    this.metrics.increment('http_requests_total', 'Total HTTP requests.', labels);
    this.metrics.set(
      'http_request_duration_ms',
      'Last observed request duration in milliseconds.',
      labels,
      durationMs,
    );
  }
}
