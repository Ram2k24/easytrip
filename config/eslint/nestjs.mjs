// Shared ESLint flat config — NestJS API application.
import { baseConfig } from './base.mjs';

export const nestConfig = [
  ...baseConfig,
  {
    files: ['**/*.ts'],
    rules: {
      // Controllers are thin (Arch §2.1): parse → command → result.
      'max-depth': ['warn', 4],
      complexity: ['warn', 15],
    },
  },
  {
    files: ['**/*.spec.ts', '**/*.e2e-spec.ts', 'test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      // `expect(obj.method).toHaveBeenCalled()` is the idiomatic jest assertion.
      '@typescript-eslint/unbound-method': 'off',
      'no-console': 'off',
    },
  },
];

export default nestConfig;
