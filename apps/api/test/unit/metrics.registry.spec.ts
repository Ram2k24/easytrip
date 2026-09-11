import { MetricsRegistry } from '../../src/infra/telemetry/metrics.registry';

describe('MetricsRegistry', () => {
  it('accumulates counters per label set', () => {
    const registry = new MetricsRegistry();
    registry.increment('http_requests_total', 'Total HTTP requests.', {
      route: '/health',
      status: 200,
    });
    registry.increment('http_requests_total', 'Total HTTP requests.', {
      route: '/health',
      status: 200,
    });
    registry.increment('http_requests_total', 'Total HTTP requests.', {
      route: '/readyz',
      status: 503,
    });

    expect(registry.value('http_requests_total', { route: '/health', status: 200 })).toBe(2);
    expect(registry.value('http_requests_total', { route: '/readyz', status: 503 })).toBe(1);
    expect(registry.value('http_requests_total', { route: '/missing', status: 200 })).toBe(0);
  });

  it('label order does not create duplicate series', () => {
    const registry = new MetricsRegistry();
    registry.increment('x_total', 'help', { a: 1, b: 2 });
    registry.increment('x_total', 'help', { b: 2, a: 1 });
    expect(registry.value('x_total', { a: 1, b: 2 })).toBe(2);
  });

  it('renders the prometheus text exposition format', () => {
    const registry = new MetricsRegistry();
    registry.set('process_uptime_seconds', 'Process uptime in seconds.', {}, 12);
    const output = registry.render();

    expect(output).toContain('# HELP process_uptime_seconds Process uptime in seconds.');
    expect(output).toContain('# TYPE process_uptime_seconds gauge');
    expect(output).toContain('process_uptime_seconds 12');
    expect(output.endsWith('\n')).toBe(true);
  });
});
