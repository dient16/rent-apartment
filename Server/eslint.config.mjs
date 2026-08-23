import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier/flat';
import prettierPlugin from 'eslint-plugin-prettier';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**', 'scripts/crawl/data/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig,
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
      prettier: prettierPlugin,
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
      'simple-import-sort/exports': 'error',
    },
  },
  {
    // TypeScript itself reports undefined identifiers, and it understands types/globals
    // that ESLint's scope analysis cannot see.
    files: ['**/*.ts'],
    rules: { 'no-undef': 'off' },
  },
  {
    // The crawler helpers are plain CommonJS scripts.
    files: ['scripts/**/*.js'],
    // These run under puppeteer; only page.evaluate() callbacks touch the DOM, so pull in
    // just those two globals rather than all of globals.browser (which shadows node's crypto).
    languageOptions: {
      sourceType: 'commonjs',
      globals: { ...globals.node, document: 'readonly', window: 'readonly' },
    },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  }
);
