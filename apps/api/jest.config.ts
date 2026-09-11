import type { Config } from 'jest';

const config: Config = {
  displayName: 'api-unit',
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: ['**/*.spec.ts'],
  // Integration specs that need a live PostgreSQL live in the workspace `tests`
  // package and run under `pnpm test:integration`.
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/test/integration/'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  // TypeScript emits `./foo.js` specifiers for `./foo.ts` (NodeNext). Jest's CJS
  // resolver needs the extension stripped to find the source file.
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
  collectCoverageFrom: ['src/**/*.ts', '!src/main.ts'],
  clearMocks: true,
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
};

export default config;
