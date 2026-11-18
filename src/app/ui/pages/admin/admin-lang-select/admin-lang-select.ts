import {Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UI_I18N } from '../../../../domain/constants/ui-i18n';
import { UpperCasePipe } from '@angular/common';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'website-admin-lang-select',
  standalone: true,
  imports: [RouterLink, UpperCasePipe],
  template: `
    <header>
      <h1>Website Administration</h1>
      <p>Select a language to manage content</p>
    </header>

    <section class="admin-table-group">
        <table>
          <thead>
            <tr>
              <th>Language Code</th>
              <th>Language Name</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            @for (lang of languages; track lang) {
              <tr>
                <td><strong>{{ lang | uppercase }}</strong></td>
                <td>{{ getLangName(lang) }}</td>
                <td>
                  <a [routerLink]="['/admin', lang]" class="btn-manage">Manage Content</a>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </section>
      
      <div class="global-actions">
        <a routerLink="/admin/create" class="btn-create">+ Create New Page</a>
      </div>
  `,
  styles: [`
    header {
      margin-bottom: 2rem;
      h1 { font-size: 2rem; color: #2c3e50; margin: 0; }
      p { color: #666; font-size: 1.1rem; margin: 0.5rem 0 0; }
    }

    .admin-table-group {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      overflow: hidden;
      margin-bottom: 2rem;

      table {
        width: 100%;
        border-collapse: collapse;
        
        th, td {
          padding: 1rem 1.5rem;
          text-align: left;
          border-bottom: 1px solid #eaeaea;
        }
        
        th {
          background: #f8f9fa;
          font-weight: 600;
          color: #777;
          text-transform: uppercase;
          font-size: 0.85rem;
          letter-spacing: 0.5px;
        }
        
        tr:last-child td { border-bottom: none; }
        tr:hover td { background: #fdfdfd; }
      }
    }

    .btn-manage {
      color: #3182ce;
      text-decoration: none;
      font-weight: 500;
      &:hover { text-decoration: underline; }
    }

    .global-actions {
      display: flex;
      justify-content: flex-end;
    }

    .btn-create {
      background: #27ae60;
      color: white;
      padding: 10px 20px;
      border-radius: 4px;
      text-decoration: none;
      font-weight: 600;
      &:hover { background: #219150; }
    }
  `]
})
export class AdminLangSelect {
  public languages = Object.keys(UI_I18N);

  getLangName(code: string): string {
    const names: Record<string, string> = {
      pt: 'Portuguese',
      en: 'English',
      es: 'Spanish',
      fr: 'French'
    };
    return names[code] || code;
  }
}
