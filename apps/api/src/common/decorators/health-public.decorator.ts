import { SetMetadata } from '@nestjs/common';

/**
 * Marks a route as reachable without authentication.
 *
 * Phase 05 only needs it for the ops/health surface; from Phase 06 the auth guard
 * reads this metadata (deny-by-default, Arch §6.2 / PRD AR-2).
 */
export const HEALTH_PUBLIC_METADATA_KEY = 'etn:public';
export const PublicHealthRoute = () => SetMetadata(HEALTH_PUBLIC_METADATA_KEY, true);
