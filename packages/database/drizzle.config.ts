import { defineConfig } from 'drizzle-kit';

/**
 * Drizzle Kit configuration (Arch §4.6).
 *
 * `generate` is offline (schema → SQL only). `migrate` needs DATABASE_URL, which
 * is supplied by the CLI (`src/cli.ts db:migrate`) from the validated env file.
 */
export default defineConfig({
  schema: './src/schema/index.ts',
  out: './migrations',
  dialect: 'postgresql',
  strict: true,
  verbose: true,
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgresql://easytrip:easytrip@127.0.0.1:5432/easytrip',
  },
});
