/**
 * Schema barrel — this file is what `drizzle.config.ts` points at, so every table
 * that must be migrated has to be exported here.
 *
 * Phase 05 ships the foundation tables only. Domain modules add their tables in
 * their own phase, each owning its prefix (Arch BR-1 ownership map).
 */
export * from './outbox.js';
