import { describe, expect, it } from 'vitest';
import { findSeeder, orderedSeeders, seeders } from '../src/seed/registry';

describe('seeder registry', () => {
  it('is ordered by the declared order field', () => {
    const orders = orderedSeeders().map((seeder) => seeder.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });

  it('ships no business seed data in Phase 05 (GC-3: no invented data)', () => {
    // Only the foundation trace + the opt-in synthetic fixtures exist.
    expect(seeders.map((seeder) => seeder.name)).toEqual([
      'foundation.platform-seeded-event',
      'demo.outbox-fixtures',
    ]);
  });

  it('marks the synthetic fixture seeder as development-only', () => {
    expect(findSeeder('demo.outbox-fixtures')?.developmentOnly).toBe(true);
    expect(findSeeder('foundation.platform-seeded-event')?.developmentOnly).toBeUndefined();
  });

  it('returns undefined for unknown names', () => {
    expect(findSeeder('nope')).toBeUndefined();
  });

  it('gives every seeder a name, description and order', () => {
    for (const seeder of seeders) {
      expect(seeder.name.length).toBeGreaterThan(0);
      expect(seeder.description.length).toBeGreaterThan(0);
      expect(typeof seeder.order).toBe('number');
    }
  });
});
