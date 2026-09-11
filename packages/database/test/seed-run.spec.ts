import { describe, expect, it } from 'vitest';
import { formatSeedResults } from '../src/seed/run';

describe('seed run reporting', () => {
  it('says so when nothing ran', () => {
    expect(formatSeedResults([])).toBe('no seeders ran');
  });

  it('reports applied seeders with their row counts', () => {
    const output = formatSeedResults([
      {
        seeder: 'foundation.platform-seeded-event',
        status: 'applied',
        inserted: 1,
        durationMs: 4.2,
      },
    ]);
    expect(output).toContain('✓ foundation.platform-seeded-event');
    expect(output).toContain('+1 rows');
    expect(output).toContain('4.2ms');
  });

  it('explains why a seeder was skipped', () => {
    const output = formatSeedResults([
      {
        seeder: 'demo.outbox-fixtures',
        status: 'skipped',
        inserted: 0,
        durationMs: 0,
        reason: 'development-only (pass --with-demo)',
      },
    ]);
    expect(output).toContain('· demo.outbox-fixtures');
    expect(output).toContain('development-only (pass --with-demo)');
  });
});
