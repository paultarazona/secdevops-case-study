'use strict';

const js = require('@eslint/js');
const globals = require('globals');

// Minimal, standard flat config for a CommonJS Node.js codebase. This is a
// CI smoke-test lint layer (see .github/workflows/pipeline.yml stage 1), not
// an exhaustive style guide.
module.exports = [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-unused-vars': ['warn', { args: 'none' }],
    },
  },
  {
    files: ['test/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ['public/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
  {
    ignores: ['node_modules/**', 'data/**', 'src/uploads/**', 'coverage/**'],
  },
];
