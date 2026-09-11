import {
  createListQuerySchema,
  DEFAULT_PAGE_LIMIT,
  MAX_PAGE_LIMIT,
  parseSortDirective,
} from '@easytrip/contracts';

/**
 * Re-exported so feature modules import list-query plumbing from one place.
 * Phase 07 admin modules build on `createListQuerySchema` with their own sortable
 * field sets.
 */
export { createListQuerySchema, DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT, parseSortDirective };
