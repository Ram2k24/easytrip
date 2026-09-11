import { describe, expect, it } from 'vitest';
import { deriveHealthStatus, HealthReportSchema, type HealthCheck } from '../src/health/health.js';
import { isEntityId, newId } from '../src/ids/id.js';

const check = (name: string, state: HealthCheck['state']): HealthCheck => ({
  name,
  state,
  latencyMs: 1,
});

describe('health status derivation', () => {
  it('is ok when every check is up', () => {
    expect(deriveHealthStatus([check('database', 'up'), check('redis', 'up')], ['database'])).toBe(
      'ok',
    );
  });

  it('is down when a required dependency is down', () => {
    expect(deriveHealthStatus([check('database', 'down')], ['database'])).toBe('down');
  });

  it('is degraded when an optional dependency is down', () => {
    expect(
      deriveHealthStatus([check('database', 'up'), check('redis', 'down')], ['database']),
    ).toBe('degraded');
  });

  it('validates a full report payload', () => {
    const parsed = HealthReportSchema.safeParse({
      status: 'ok',
      service: 'easytrip-api',
      version: '0.5.0',
      environment: 'development',
      timestamp: new Date().toISOString(),
      uptimeSeconds: 1.5,
      checks: [check('database', 'up')],
    });
    expect(parsed.success).toBe(true);
  });
});

describe('ulid identifiers (DB convention C-1)', () => {
  it('generates 26-character Crockford base32 ids', () => {
    const id = newId();
    expect(id).toHaveLength(26);
    expect(isEntityId(id)).toBe(true);
  });

  it('is deterministic for a fixed seed time and sorts chronologically', () => {
    const earlier = newId(1_700_000_000_000);
    const later = newId(1_800_000_000_000);
    expect(isEntityId(earlier)).toBe(true);
    expect(earlier.localeCompare(later)).toBeLessThan(0);
  });

  it('rejects malformed ids', () => {
    expect(isEntityId('nope')).toBe(false);
    expect(isEntityId(undefined)).toBe(false);
  });
});
