import { newId } from '@easytrip/contracts';
import { outbox } from '../../schema/index.js';
import type { Seeder } from '../types.js';

/**
 * Foundation seeder: records a `platform.seeded` event in the transactional
 * outbox (Arch §12.4) so every seed run leaves a verifiable trace in the same
 * table the dispatcher consumes.
 *
 * This is a real write against a real table — it is how `db:seed` proves the
 * pipeline works end to end before any business module exists.
 */
export const platformSeededEventSeeder: Seeder = {
  name: 'foundation.platform-seeded-event',
  description: 'Append a platform.seeded event to the transactional outbox.',
  order: 10,
  async run(ctx) {
    if (ctx.dryRun) return 0;
    const now = new Date();
    await ctx.db.insert(outbox).values({
      id: newId(),
      aggregateType: 'platform',
      aggregateId: 'seed-run',
      eventType: 'platform.seeded',
      payload: {
        seededAt: now.toISOString(),
        fresh: ctx.fresh,
        note: 'Recorded by the development seed mechanism (Phase 05).',
      },
      createdAt: now,
    });
    return 1;
  },
};
