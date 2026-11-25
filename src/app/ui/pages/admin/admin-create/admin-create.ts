import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminFacade } from '../../../../application/facades/admin.facade';
import { CmsPagePayload } from '../../../../domain/models/cms.interface';
import { AdminForm } from '../admin-form/admin-form';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'website-admin-create',
  standalone: true,
  imports: [AdminForm],
  template: `
    <div class="admin-create">
      <h2 class="admin-create__title">Create New Page</h2>
      @if (error()) {
        <div class="error-message" role="alert">{{ error() }}</div>
      }
      <website-admin-form (save)="onSave($event)" (cancel)="onCancel()"></website-admin-form>
    </div>
  `,
  styles: [`
    .admin-create {
      padding: 0;

      &__title {
        margin: 0 0 16px;
        font-family: var(--font-sans);
        color: #0f172a;
        font-size: 1.5rem;
        font-weight: 600;

        @media (min-width: 768px) {
          font-size: 1.75rem;
        }
      }
    }
    .error-message {
      color: #b91c1c;
      background: #fef2f2;
      border: 1px solid #fecaca;
      padding: 12px;
      border-radius: 6px;
      margin-bottom: 16px;
      font-size: 0.875rem;
    }
  `]
})
export default class AdminCreate implements OnInit {
  private readonly adminService = inject(AdminFacade);
  private readonly route = inject(ActivatedRoute, { optional: true });
  private readonly router = inject(Router);

  public readonly error = signal<string | null>(null);

  public ngOnInit(): void {
    const routeLang = this.route?.snapshot.paramMap.get('lang');
    if (routeLang) {
      this.adminService.lang.set(routeLang);
    }
  }

  public async onSave(data: CmsPagePayload): Promise<void> {
    this.error.set(null);
    try {
      const page = await this.adminService.createPage(data);
      const slug = data.title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      await this.adminService.createUrl({
        url: slug,
        page_id: page.id,
        lang: data.lang
      });

      await this.router.navigate(['/admin', data.lang]);
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'Error creating page. Please try again.';
      this.error.set(message);
    }
  }

  public onCancel(): void {
    void this.router.navigate(['/admin']);
  }
}
