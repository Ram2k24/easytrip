import { z } from 'zod';
import { DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT } from './pagination.js';

/**
 * Shared list-query contract used by every admin/vendor/customer list endpoint
 * (Phase 07 modules reuse this instead of re-declaring query params).
 *
 * `sort` is expressed as `field` or `-field` (descending). Callers pass the set
 * of sortable fields so unknown values fail validation rather than reaching SQL.
 */
export interface SortDirective {
  field: string;
  direction: 'asc' | 'desc';
}

export function parseSortDirective(raw: string): SortDirective | null {
  if (raw.length === 0) return null;
  const descending = raw.startsWith('-');
  const field = descending ? raw.slice(1) : raw;
  if (field.length === 0) return null;
  return { field, direction: descending ? 'desc' : 'asc' };
}

/**
 * Build a Zod schema for a list endpoint's query string.
 *
 * @param sortable the fields this endpoint accepts in `sort`
 * @param defaultSort applied when the caller omits `sort`
 */
export function createListQuerySchema<TSortable extends string>(
  sortable: readonly TSortable[],
  defaultSort: `-${TSortable}` | TSortable,
) {
  return z.object({
    cursor: z.string().min(1).nullish(),
    limit: z.coerce.number().int().min(1).max(MAX_PAGE_LIMIT).default(DEFAULT_PAGE_LIMIT),
    sort: z
      .string()
      .min(1)
      .refine(
        (raw) => {
          const parsed = parseSortDirective(raw);
          return parsed !== null && (sortable as readonly string[]).includes(parsed.field);
        },
        { message: `sort must be one of: ${sortable.join(', ')} (prefix with - for descending)` },
      )
      .default(defaultSort),
  });
}

export type ListQuery<TSortable extends string> = z.infer<
  ReturnType<typeof createListQuerySchema<TSortable>>
>;
