// Shared ESLint flat config — Next.js web application.
import { FlatCompat } from '@eslint/eslintrc';
import { baseConfig } from './base.mjs';

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

export const nextConfig = [
  ...baseConfig,
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      // Design tokens are enforced by Phase 02 CI gates; formatting is Prettier's job.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
];

export default nextConfig;
