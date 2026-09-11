import config from '../../config/eslint/nextjs.mjs';

export default [
  ...config,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  { ignores: ['.next/**', 'next-env.d.ts'] },
];
