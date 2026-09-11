/** Canonical Prettier options for the whole workspace (single source of truth). */
export const prettierConfig = {
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  arrowParens: 'always',
  endOfLine: 'lf',
  bracketSpacing: true,
  overrides: [
    {
      files: ['*.md', '*.mdx'],
      options: { printWidth: 100, proseWrap: 'preserve' },
    },
  ],
};

export default prettierConfig;
