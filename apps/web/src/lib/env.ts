/**
 * Web runtime configuration (Arch §25.2 "Web (build-time, allowlisted)").
 *
 * Only `NEXT_PUBLIC_*` values are reachable from the browser; everything else is
 * read server-side at request time. The CI allowlist check enforces this.
 */
export interface WebEnv {
  /** Server-side origin of the API. */
  apiUrl: string;
  /** Browser-visible API origin (may differ behind a reverse proxy). */
  publicApiUrl: string | undefined;
  siteName: string;
}

export function getWebEnv(env: Readonly<Record<string, string | undefined>> = process.env): WebEnv {
  return {
    apiUrl: env.API_URL ?? 'http://127.0.0.1:4000',
    publicApiUrl: env.NEXT_PUBLIC_API_URL,
    siteName: env.NEXT_PUBLIC_SITE_NAME ?? 'Easy Trip Nepal',
  };
}
