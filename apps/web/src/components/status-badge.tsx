import type { ComponentState } from '@easytrip/contracts';

const LABELS: Record<ComponentState, string> = {
  up: 'Operational',
  degraded: 'Degraded',
  down: 'Unavailable',
  unknown: 'Unknown',
};

const TONES: Record<ComponentState, string> = {
  up: 'bg-success/15 text-success border-success/30',
  degraded: 'bg-warning/15 text-warning border-warning/30',
  down: 'bg-danger/15 text-danger border-danger/30',
  unknown: 'bg-muted/15 text-muted border-muted/30',
};

/**
 * Dependency status pill. One of the Phase 02 state-coverage components
 * (UX §11.2): every state of the underlying value has a distinct presentation.
 */
export function StatusBadge({
  state,
  label,
  latencyMs,
}: {
  state: ComponentState;
  label: string;
  latencyMs?: number | null;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium ${TONES[state]}`}
      data-testid="status-badge"
      data-state={state}
    >
      <span className="sr-only">{`${label}: ${LABELS[state]}`}</span>
      <span aria-hidden>{LABELS[state]}</span>
      {typeof latencyMs === 'number' ? (
        <span className="text-xs opacity-70">{`${latencyMs.toFixed(1)} ms`}</span>
      ) : null}
    </span>
  );
}
