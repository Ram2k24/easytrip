import { demoOutboxFixturesSeeder } from './seeders/demo-outbox-fixtures.js';
import { platformSeededEventSeeder } from './seeders/platform-seeded-event.js';
import type { Seeder } from './types.js';

/**
 * Seeder registry.
 *
 * Domain modules register their seeders here as they land (Phase 06+). Phase 05
 * intentionally ships **no business seed data** — the mechanism is the
 * deliverable, and inventing catalog/booking data now would contradict GC-3.
 */
export const seeders: readonly Seeder[] = [platformSeededEventSeeder, demoOutboxFixturesSeeder];

/** Order-stable view of the registry, dev-only seeders included. */
export function orderedSeeders(): Seeder[] {
  return [...seeders].sort((a, b) => a.order - b.order);
}

export function findSeeder(name: string): Seeder | undefined {
  return seeders.find((seeder) => seeder.name === name);
}
