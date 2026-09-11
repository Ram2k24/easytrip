import { newId } from '@easytrip/contracts';
import { outbox } from '../../schema/index.js';
import type { Seeder } from '../types.js';

/**
 * Opt-in synthetic fixtures (`db:seed --with-demo`).
 *
 * Explicitly labelled dev fixtures (Arch §26: "Dev fixtures (explicitly
 * synthetic, labeled)"). They exist so the outbox dispatcher has something to
 * scan during local development; they are never a data source (GC-3).
 */
const FIXTURE_EVENT_TYPES = [
  'platform.initialized',
  'platform.migrated',
  'platform.seeded',
] as const;

export const demoOutboxFixturesSeeder: Seeder = {
  name: 'demo.outbox-fixtures',
  description: 'Insert labelled synthetic outbox events (development only).',
  order: 90,
  developmentOnly: true,
  async run(ctx) {
    if (ctx.dryRun) return 0;
    const now = new Date();
    const rows = FIXTURE_EVENT_TYPES.map((eventType, index) => ({
      id: newId(now.getTime() + index),
      aggregateType: 'platform',
      aggregateId: `fixture-${String(index + 1)}`,
      eventType,
      payload: { synthetic: true, generatedBy: 'demo.outbox-fixtures', index },
      createdAt: now,
    }));
    await ctx.db.insert(outbox).values(rows);
    return rows.length;
  },
};
