import { z } from 'zod';
import type { Page } from './pagination.js';

/**
 * Response envelope (Arch §3.3).
 *
 *   success: { "data": … }
 *   list:    { "data": […], "page": { "nextCursor": …, "limit": …, "returned": … } }
 *   error:   { "error": { "code", "message", "details?", "requestId" } }
 */
export const ErrorDetailsSchema = z.record(z.string(), z.unknown());
export type ErrorDetails = z.infer<typeof ErrorDetailsSchema>;

export const ApiErrorBodySchema = z.object({
  code: z.string(),
  message: z.string(),
  details: ErrorDetailsSchema.optional(),
  requestId: z.string(),
});
export type ApiErrorBody = z.infer<typeof ApiErrorBodySchema>;

export const ApiErrorEnvelopeSchema = z.object({ error: ApiErrorBodySchema });
export type ApiErrorEnvelope = z.infer<typeof ApiErrorEnvelopeSchema>;

export function errorEnvelope(body: ApiErrorBody): ApiErrorEnvelope {
  return { error: body };
}

export interface ApiEnvelope<T> {
  data: T;
}

export interface ApiListEnvelope<T> {
  data: T[];
  page: Page;
}

export function envelope<T>(data: T): ApiEnvelope<T> {
  return { data };
}

export function listEnvelope<T>(data: readonly T[], page: Page): ApiListEnvelope<T> {
  return { data: [...data], page };
}

/** Build a Zod schema for a single-object envelope around `item`. */
export function apiEnvelopeSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({ data: item });
}

/** Build a Zod schema for a list envelope around `item`. */
export function apiListEnvelopeSchema<T extends z.ZodTypeAny>(item: T, page: z.ZodTypeAny) {
  return z.object({ data: z.array(item), page });
}
