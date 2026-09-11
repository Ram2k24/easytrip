import type { Env } from '@easytrip/contracts';

/** DI token for the validated environment object (Arch §25.1, zod-validated at boot). */
export const ENV_TOKEN = Symbol('ETN_ENV');

export type EnvToken = Env;
