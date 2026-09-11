// Shared ESLint flat config — base for every workspace package (Arch §1.1, A1.3).
// Type-aware linting: the parser service resolves each file to its package tsconfig.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

/** Globs that must never be linted (build artefacts, generated code, dependencies). */
export const sharedIgnores = [
  '**/node_modules/**',
  '**/dist/**',
  '**/.next/**',
  '**/.turbo/**',
  '**/coverage/**',
  '**/out/**',
  '**/*.d.ts',
  // Tooling configs are not part of any TypeScript project (no allowJs).
  '**/*.mjs',
  'packages/database/migrations/**',
];

export const baseConfig = tseslint.config(
  { ignores: sharedIgnores },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      parserOptions: {
        // Type-aware linting. `tsconfigRootDir` is set per package (each package's
        // eslint.config.mjs points at its own directory).
        projectService: true,
      },
    },
    rules: {
      // Consistency guards that matter for this codebase (Arch BR rules, GC-7 money).
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'no-return-await': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/require-await': 'warn',
      '@typescript-eslint/no-explicit-any': 'error',
      // NestJS DI + Drizzle column builders legitimately use non-null assertion on
      // framework-injected properties; keep it explicit rather than blanket-allowed.
      '@typescript-eslint/no-non-null-assertion': 'warn',
    },
  },
  prettier,
);

export default baseConfig;
