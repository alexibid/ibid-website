import nx from '@nx/eslint-plugin';
import baseConfig from '../../eslint.config.mjs';

export default [
  {
    ignores: [
      '**/api/**',
      'api/**',
      '**/dist/**',
      '**/out-tsc/**',
      '**/test-results/**',
      '**/pocketbase/**'
    ]
  },
  ...nx.configs['flat/angular'],
  ...nx.configs['flat/angular-template'],
  ...baseConfig,
  {
    files: ['**/*.ts'],
    rules: {
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'website', style: 'kebab-case' }
      ],
      '@angular-eslint/prefer-inject': 'warn',
      '@angular-eslint/no-output-native': 'off',
      '@angular-eslint/no-empty-lifecycle-method': 'off'
    }
  },
  {
    files: ['src/app/domains/book/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/domains/contact/**', '**/domains/content-management/**'],
              message: 'Cross-domain imports are forbidden. Use shared or core instead.'
            }
          ]
        }
      ]
    }
  },
  {
    files: ['src/app/domains/contact/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/domains/book/**', '**/domains/content-management/**'],
              message: 'Cross-domain imports are forbidden. Use shared or core instead.'
            }
          ]
        }
      ]
    }
  },
  {
    files: ['src/app/domains/content-management/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/domains/book/**', '**/domains/contact/**'],
              message: 'Cross-domain imports are forbidden. Use shared or core instead.'
            }
          ]
        }
      ]
    }
  },
  {
    files: ['**/*.html'],
    rules: {
      '@angular-eslint/template/click-events-have-key-events': 'off',
      '@angular-eslint/template/interactive-supports-focus': 'off',
      '@angular-eslint/template/label-has-associated-control': 'off',
      '@angular-eslint/template/alt-text': 'off'
    }
  },
  {
    files: ['src/app/domains/content-management/admin/admin-form/admin-form.ts'],
    rules: {
      '@angular-eslint/template/click-events-have-key-events': 'off',
      '@angular-eslint/template/interactive-supports-focus': 'off',
      '@angular-eslint/template/label-has-associated-control': 'off',
      '@angular-eslint/template/alt-text': 'off'
    }
  }
];
