/**
 * DI token for the metrics registry.
 *
 * Kept in its own file on purpose: `telemetry.module.ts` imports the interceptor
 * and the interceptor imports the token, so co-locating them would be a circular
 * import that leaves the token `undefined` when the `@Inject` decorator runs.
 */
export const METRICS_REGISTRY = Symbol('ETN_METRICS_REGISTRY');
