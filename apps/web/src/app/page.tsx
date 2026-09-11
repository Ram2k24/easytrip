import { HealthReportSchema, type HealthReport } from '@easytrip/contracts';
import { StatusBadge } from '@/components/status-badge';
import { getWebEnv } from '@/lib/env';

// Health is fetched per request; never prerendered into the build output.
export const dynamic = 'force-dynamic';

interface HealthFetchResult {
  report: HealthReport | null;
  error: string | null;
}

async function fetchHealth(apiUrl: string): Promise<HealthFetchResult> {
  try {
    const response = await fetch(`${apiUrl.replace(/\/$/, '')}/health`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(3_000),
    });
    const payload: unknown = await response.json();
    const data =
      typeof payload === 'object' && payload !== null && 'data' in payload ? payload.data : payload;
    const parsed = HealthReportSchema.safeParse(data);
    if (!parsed.success)
      return { report: null, error: 'Health payload did not match the contract.' };
    return { report: parsed.data, error: null };
  } catch (error) {
    return { report: null, error: error instanceof Error ? error.message : 'API unreachable' };
  }
}

export default async function HomePage() {
  const env = getWebEnv();
  const { report, error } = await fetchHealth(env.apiUrl);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
          {env.siteName}
        </p>
        <h1 className="text-3xl font-bold tracking-tight">Platform status</h1>
        <p className="text-muted">
          Phase 05 — project initialization. This page is server-rendered and reads the API&apos;s
          live health report; it contains no static or mocked data.
        </p>
      </header>

      {report === null ? (
        <section className="rounded-[var(--radius-card)] border border-danger/30 bg-danger/5 p-6">
          <h2 className="font-semibold text-danger">API unreachable</h2>
          <p className="mt-2 text-sm text-muted">{error ?? 'Unknown error'}</p>
          <p className="mt-2 text-sm text-muted">
            Expected the API at <code>{env.apiUrl}</code>. Start it with <code>pnpm dev</code>.
          </p>
        </section>
      ) : (
        <section className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-black/5 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold">{report.service}</h2>
              <p className="text-sm text-muted">
                {`v${report.version} · ${report.environment} · up ${String(Math.round(report.uptimeSeconds))}s`}
              </p>
            </div>
            <StatusBadge
              state={report.status === 'ok' ? 'up' : report.status === 'down' ? 'down' : 'degraded'}
              label="Overall"
            />
          </div>

          <ul className="flex flex-col gap-3">
            {report.checks.map((check) => (
              <li
                key={check.name}
                className="flex items-center justify-between gap-4 border-t border-black/5 pt-3"
              >
                <div>
                  <p className="font-medium capitalize">{check.name}</p>
                  <p className="text-sm text-muted">{check.message ?? '—'}</p>
                </div>
                <StatusBadge state={check.state} label={check.name} latencyMs={check.latencyMs} />
              </li>
            ))}
          </ul>

          <p className="text-xs text-muted">{`Checked at ${report.timestamp}`}</p>
        </section>
      )}
    </main>
  );
}
