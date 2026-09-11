/**
 * Schema barrel — this file is what `drizzle.config.ts` points at, so every table
 * that must be migrated has to be exported here.
 *
 * Phase 05 shipped the foundation (`outbox`). Phase 06 adds identity & access
 * (DB §4) and vendors (DB §6). Each module owns its own prefix (Arch BR-1) and may
 * only read/write tables it owns.
 */
export * from './outbox.js';

// Phase 06 — identity, access, audit
export * from './common.js';
export * from './geo.js';
export * from './user.js';
export * from './role.js';
export * from './auth.js';
export * from './audit.js';

// Phase 06 — vendor onboarding & approval
export * from './vendor.js';
