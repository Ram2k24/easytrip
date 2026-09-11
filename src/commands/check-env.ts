import {
  redactConnectionString,
  inspectWorkspaceEnv,
  NON_SECRET_ENV_KEYS,
} from '../lib/env-loader.js';

/** `pnpm check:env` — validate the environment without starting anything. */
export function checkEnv(): number {
  const { loaded, result } = inspectWorkspaceEnv();

  process.stdout.write(
    `env files loaded: ${loaded.length === 0 ? '(none)' : loaded.join(', ')}\n\n`,
  );

  if (!result.ok) {
    process.stdout.write(`✗ ${result.message}\n`);
    return 1;
  }

  const env = result.env;
  process.stdout.write('✓ environment is valid\n\n');
  for (const key of NON_SECRET_ENV_KEYS) {
    const value = env[key];
    process.stdout.write(
      `  ${key.padEnd(24)} ${Array.isArray(value) ? value.join(',') : String(value)}\n`,
    );
  }
  process.stdout.write(
    `  ${'DATABASE_URL'.padEnd(24)} ${redactConnectionString(env.DATABASE_URL)}\n`,
  );
  process.stdout.write(`  ${'REDIS_URL'.padEnd(24)} ${redactConnectionString(env.REDIS_URL)}\n`);
  process.stdout.write(`  ${'ALLOWED_ORIGINS'.padEnd(24)} ${env.ALLOWED_ORIGINS.join(',')}\n`);
  return 0;
}
