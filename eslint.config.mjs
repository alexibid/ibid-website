import nx from '@nx/eslint-plugin';
import baseConfig from '../../eslint.config.mjs';

export default [
  {
    ignores: [
      '**/api/**',
      'api/**',
      '**/functions/**',
      'functions/**',
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
    files: ['src/app/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@angular/**',
                'rxjs',
                'rxjs/**',
                '**/application/**',
                '**/infrastructure/**',
                '**/ui/**'
              ],
              message:
                'Domain layer must stay framework-free and independent of application, infrastructure, and UI layers.'
            }
          ]
        }
      ]
    }
  },
  {
    files: ['src/app/application/facades/contact.facade.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/ui/**', './*', './**', '../facades/**', '**/application/facades/**'],
              message: 'ContactFacade cannot import UI modules or sibling facades.'
            }
          ]
        }
      ]
    }
  },
  {
    files: ['src/app/ui/pages/exit/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/infrastructure/**', '**/application/state/**'],
              message:
                'Exit UI must communicate exclusively through application facades and directives.'
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
    files: ['src/app/ui/pages/exit/**/*.html'],
    rules: {
      '@angular-eslint/template/click-events-have-key-events': 'error',
      '@angular-eslint/template/interactive-supports-focus': 'error',
      '@angular-eslint/template/label-has-associated-control': 'error',
      '@angular-eslint/template/alt-text': 'error'
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
