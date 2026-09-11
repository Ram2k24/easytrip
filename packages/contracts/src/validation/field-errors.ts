import type { z } from 'zod';

/**
 * Map a Zod failure onto the `details.fields` shape the API contract promises
 * for `ETN-VAL-001` (Arch §17.1).
 */
export type FieldErrorMap = Record<string, string[]>;

function pathToString(path: readonly (string | number | symbol)[]): string {
  if (path.length === 0) return '_root';
  return path
    .map((segment) => (typeof segment === 'number' ? `[${String(segment)}]` : String(segment)))
    .join('.')
    .replace(/\.\[/g, '[');
}

export function zodIssuesToFieldMap(error: z.ZodError): FieldErrorMap {
  const map: FieldErrorMap = {};
  for (const issue of error.issues) {
    const key = pathToString(issue.path);
    const existing = map[key];
    if (existing) existing.push(issue.message);
    else map[key] = [issue.message];
  }
  return map;
}

/** Flatten a field map into one-line messages, useful for logs and CLI output. */
export function fieldMapToLines(map: FieldErrorMap): string[] {
  return Object.entries(map).flatMap(([field, messages]) =>
    messages.map((message) => `${field}: ${message}`),
  );
}
