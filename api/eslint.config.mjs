import baseConfig from '../../../eslint.config.mjs';

export default [
  {
    ignores: ['dist/**', 'out-tsc/**', 'node_modules/**', 'coverage/**'],
  },
  ...baseConfig,
  {
    files: ['src/**/*.ts'],
    rules: {
      'max-lines': ['error', { max: 300, skipBlankLines: false, skipComments: false }],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
];
