import { z } from 'zod';

/**
 * Canonical enum catalog.
 *
 * Values are mirrored 1:1 from the Phase 04 enum catalog
 * (`docs/db/04-database-architecture.md` §3) and are the single source of truth
 * for both the API and the web app (Arch §21.3, shared kernel).
 *
 * Only the enums required by the Phase 05 foundation are declared here; domain
 * modules add their own values as they land (additive only, Arch §24).
 */

/** `svc_line` — service lines (DB §3). */
export const SERVICE_LINES = [
  'TOUR',
  'TREK',
  'HOTEL',
  'VEHICLE',
  'TRANSFER',
  'TRANSPORTATION',
  'PACKAGE',
  'FLIGHT',
] as const;
export type ServiceLine = (typeof SERVICE_LINES)[number];
export const ServiceLineSchema = z.enum(SERVICE_LINES);

/** `role.code` platform roles (DB §3, PRD §5.1). */
export const PLATFORM_ROLES = [
  'SUPER_ADMIN',
  'OPS',
  'FINANCE',
  'SUPPORT',
  'TRIP_DESK',
  'CUST',
  'VENDOR',
] as const;
export type PlatformRole = (typeof PLATFORM_ROLES)[number];
export const PlatformRoleSchema = z.enum(PLATFORM_ROLES);

/** `APP_ENV` — deployment environments (Arch §25.2, §26). */
export const APP_ENVS = ['development', 'test', 'staging', 'production'] as const;
export type AppEnv = (typeof APP_ENVS)[number];
export const AppEnvSchema = z.enum(APP_ENVS);

/** Log levels accepted by `LOG_LEVEL` (Arch §14.1). */
export const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];
export const LogLevelSchema = z.enum(LOG_LEVELS);

/**
 * Outbox `event_type` values owned by the foundation (Arch §12.4, DB §4.13).
 * Domain modules append their own event types; the dispatcher is schema-agnostic.
 */
export const FOUNDATION_EVENT_TYPES = [
  'platform.initialized',
  'platform.migrated',
  'platform.seeded',
] as const;
export type FoundationEventType = (typeof FOUNDATION_EVENT_TYPES)[number];
