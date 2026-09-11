/**
 * Minimal in-process metrics registry exposed at `GET /metrics` (Arch §3.4 ops
 * surface, §15.4 dashboards).
 *
 * Deliberately dependency-free: the OTLP/OpenTelemetry pipeline (Arch T-11) lands
 * with the self-hosted `obs` compose profile; until then these counters give the
 * ops surface something real to scrape.
 */
export type MetricLabels = Readonly<Record<string, string | number>>;

interface Series {
  labels: MetricLabels;
  value: number;
}

const COUNTER = 'counter';
const GAUGE = 'gauge';
type MetricKind = typeof COUNTER | typeof GAUGE;

function labelKey(labels: MetricLabels): string {
  return Object.entries(labels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(',');
}

function renderLabels(labels: MetricLabels): string {
  const entries = Object.entries(labels);
  if (entries.length === 0) return '';
  const body = entries
    .map(([key, value]) => `${key}="${String(value).replace(/"/g, '\\"')}"`)
    .join(',');
  return `{${body}}`;
}

export class MetricsRegistry {
  private readonly metrics = new Map<
    string,
    { kind: MetricKind; help: string; series: Map<string, Series> }
  >();

  private ensure(name: string, kind: MetricKind, help: string) {
    const existing = this.metrics.get(name);
    if (existing) return existing;
    const created = { kind, help, series: new Map<string, Series>() };
    this.metrics.set(name, created);
    return created;
  }

  increment(name: string, help: string, labels: MetricLabels = {}, by = 1): void {
    const metric = this.ensure(name, COUNTER, help);
    const key = labelKey(labels);
    const current = metric.series.get(key);
    if (current) current.value += by;
    else metric.series.set(key, { labels, value: by });
  }

  set(name: string, help: string, labels: MetricLabels, value: number): void {
    const metric = this.ensure(name, GAUGE, help);
    metric.series.set(labelKey(labels), { labels, value });
  }

  value(name: string, labels: MetricLabels = {}): number {
    return this.metrics.get(name)?.series.get(labelKey(labels))?.value ?? 0;
  }

  /** Render in the Prometheus text exposition format. */
  render(): string {
    const lines: string[] = [];
    for (const [name, metric] of [...this.metrics.entries()].sort(([a], [b]) =>
      a.localeCompare(b),
    )) {
      lines.push(`# HELP ${name} ${metric.help}`);
      lines.push(`# TYPE ${name} ${metric.kind}`);
      for (const series of metric.series.values()) {
        lines.push(`${name}${renderLabels(series.labels)} ${String(series.value)}`);
      }
    }
    return `${lines.join('\n')}\n`;
  }
}
