import { z } from 'zod';

/**
 * Health/readiness contract served by the API (Arch §15.2) and consumed by the
 * web app's status surface.
 *
 *   GET /health      → liveness + dependency checks (always answers)
 *   GET /health/ready→ readiness (503 when a required dependency is down)
 */
export const COMPONENT_STATES = ['up', 'down', 'degraded', 'unknown'] as const;
export type ComponentState = (typeof COMPONENT_STATES)[number];
export const ComponentStateSchema = z.enum(COMPONENT_STATES);

export const HealthCheckSchema = z.object({
  name: z.string(),
  state: ComponentStateSchema,
  /** Round-trip latency of the probe, or null when the probe did not complete. */
  latencyMs: z.number().nonnegative().nullable(),
  /** Short, user-safe explanation. Never leak connection strings or stack traces. */
  message: z.string().nullish(),
});
export type HealthCheck = z.infer<typeof HealthCheckSchema>;

export const HEALTH_STATUSES = ['ok', 'degraded', 'down'] as const;
export type HealthStatus = (typeof HEALTH_STATUSES)[number];
export const HealthStatusSchema = z.enum(HEALTH_STATUSES);

export const HealthReportSchema = z.object({
  status: HealthStatusSchema,
  service: z.string(),
  version: z.string(),
  environment: z.string(),
  /** ISO-8601 UTC timestamp of when the report was produced. */
  timestamp: z.string(),
  /** Process uptime in seconds (monotonic clock). */
  uptimeSeconds: z.number().nonnegative(),
  checks: z.array(HealthCheckSchema),
});
export type HealthReport = z.infer<typeof HealthReportSchema>;

/**
 * Derive overall status from component checks.
 *
 * A `required` component that is down makes the whole report `down`; a degraded
 * or optional-down component makes it `degraded`.
 */
export function deriveHealthStatus(
  checks: readonly HealthCheck[],
  required: readonly string[],
): HealthStatus {
  const requiredSet = new Set(required);
  for (const check of checks) {
    if (check.state === 'down' && requiredSet.has(check.name)) return 'down';
  }
  const anyProblem = checks.some(
    (check) => check.state === 'down' || check.state === 'degraded' || check.state === 'unknown',
  );
  return anyProblem ? 'degraded' : 'ok';
}
