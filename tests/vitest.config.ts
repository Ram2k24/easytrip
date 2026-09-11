import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['integration/**/*.spec.ts'],
    // Each spec boots its own PostgreSQL cluster; never run them concurrently.
    fileParallelism: false,
    testTimeout: 120_000,
    hookTimeout: 120_000,
    pool: 'forks',
  },
});
