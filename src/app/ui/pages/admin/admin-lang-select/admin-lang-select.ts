import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UpperCasePipe } from '@angular/common';
import { SUPPORTED_LANGUAGES } from '../../../../infrastructure/services/i18n.service';
import { LANGUAGE_LABELS, isSupportedLanguage } from '../../../../domain/constants/languages';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'website-admin-lang-select',
  standalone: true,
  imports: [RouterLink, UpperCasePipe],
  template: `
    <header class="admin-lang-header">
      <h1 class="admin-lang-header__title">Website Administration</h1>
      <p class="admin-lang-header__lead">Select a language to manage content</p>
    </header>

    <section class="admin-table-group">
      <table class="admin-table-group__table">
        <thead>
          <tr>
            <th class="admin-table-group__cell admin-table-group__cell--head" scope="col">Language Code</th>
            <th class="admin-table-group__cell admin-table-group__cell--head" scope="col">Language Name</th>
            <th class="admin-table-group__cell admin-table-group__cell--head" scope="col">Action</th>
          </tr>
        </thead>
        <tbody>
          @for (lang of languages; track lang) {
            <tr class="admin-table-group__row">
              <td class="admin-table-group__cell"><strong>{{ lang | uppercase }}</strong></td>
              <td class="admin-table-group__cell">{{ getLangName(lang) }}</td>
              <td class="admin-table-group__cell">
                <a [routerLink]="['/admin', lang]" class="btn-manage">Manage Content</a>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </section>

    <div class="admin-lang-actions">
      <a routerLink="/admin/create" class="btn-create">+ Create New Page</a>
    </div>
  `,
  styles: [`
    .admin-lang-header {
      margin-bottom: 1.5rem;

      &__title {
        font-family: var(--font-sans);
        font-size: 1.75rem;
        font-weight: 600;
        color: #0f172a;
        margin: 0;
      }

      &__lead {
        font-family: var(--font-sans);
        color: #475569;
        font-size: 0.9375rem;
        margin: 0.375rem 0 0;
      }
    }

    .admin-table-group {
      background: #ffffff;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
      overflow: hidden;
      margin-bottom: 1.5rem;

      &__table {
        width: 100%;
        border-collapse: collapse;
      }

      &__row {
        border-bottom: 1px solid #e2e8f0;

        &:last-child {
          border-bottom: none;
        }

        &:hover {
          background: #f8fafc;
        }
      }

      &__cell {
        padding: 0.875rem 1.5rem;
        text-align: left;

        &--head {
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          font-weight: 600;
          color: #475569;
          text-transform: uppercase;
          font-size: 0.75rem;
          letter-spacing: 0.05em;
        }
      }
    }

    .btn-manage {
      color: #1d4ed8;
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 600;

      &:hover {
        text-decoration: underline;
      }
    }

    .admin-lang-actions {
      display: flex;
      justify-content: flex-end;
    }

    .btn-create {
      background: #15803d;
      color: #ffffff;
      padding: 0.375rem 0.875rem;
      min-height: 36px;
      min-width: auto;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      font-family: var(--font-sans);
      font-size: 0.875rem;
      line-height: 1.25;
      text-decoration: none;
      font-weight: 600;
      transition: background-color 0.2s ease;

      &:hover {
        background: #166534;
      }

      @media (prefers-reduced-motion: reduce) {
        transition: none;
      }
    }
  `]
})
export class AdminLangSelect {
  public readonly languages = inject(SUPPORTED_LANGUAGES);

  getLangName(code: string): string {
    return isSupportedLanguage(code) ? LANGUAGE_LABELS[code].name : code;
  }
}
