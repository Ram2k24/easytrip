import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.spec.ts'],
    // Integration specs that need a live PostgreSQL are run by the workspace
    // `tests` package (root) via `pnpm test:integration`.
    exclude: ['test/integration/**', 'node_modules/**'],
  },
});
