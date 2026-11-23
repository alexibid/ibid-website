import { ChangeDetectionStrategy, Component, OnInit, PendingTasks, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminFacade } from '../../../../application/facades/admin.facade';
import { CmsPage, CmsUrl } from '../../../../domain/models/cms.interface';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'website-admin-delete',
  standalone: true,
  template: `
    <div class="delete-confirm">
      <h2>Delete Page</h2>
      @if (error()) {
        <div class="error-message" role="alert">{{ error() }}</div>
      }
      @if (page()) {
        <p>Are you sure you want to delete the page <strong>"{{ page()?.title }}"</strong>?</p>
        <p class="warning">Warning: This action will also delete all URLs associated with this page.</p>

        <div class="actions">
          <button type="button" class="btn-cancel" (click)="onCancel()">Cancel</button>
          <button
            type="button"
            class="btn-danger"
            [disabled]="isDeleting()"
            (click)="onDelete()"
          >
            {{ isDeleting() ? 'Deleting...' : 'Confirm Delete' }}
          </button>
        </div>
      } @else if (!error()) {
        <p class="loading-text">Loading data...</p>
      }
    </div>
  `,
  styles: [`
    .delete-confirm {
      max-width: 600px;
      margin: 20px auto;
      padding: 20px;
      background: #ffffff;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(15, 23, 42, 0.08);
    }
    h2 {
      color: #b91c1c;
      margin: 0 0 16px;
    }
    .error-message {
      color: #b91c1c;
      background: #fef2f2;
      border: 1px solid #fecaca;
      padding: 12px;
      border-radius: 4px;
      margin-bottom: 16px;
      font-size: 0.9rem;
    }
    .warning {
      color: #475569;
      font-size: 0.95rem;
      margin: 16px 0;
      padding: 12px;
      background: #fef2f2;
      border-left: 4px solid #b91c1c;
    }
    .loading-text {
      color: #475569;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 24px;
    }
    button {
      padding: 10px 20px;
      min-height: 44px;
      min-width: 44px;
      border-radius: 4px;
      font-weight: 600;
      cursor: pointer;
      border: none;
    }
    button:focus-visible {
      outline: 2px solid #1d4ed8;
      outline-offset: 2px;
    }
    .btn-cancel {
      background: #f8fafc;
      color: #0f172a;
      border: 1px solid #cbd5e1;
    }
    .btn-danger {
      background: #b91c1c;
      color: #ffffff;
    }
    .btn-danger:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
    @media (min-width: 768px) {
      .delete-confirm {
        margin: 40px auto;
        padding: 30px;
      }
    }
  `]
})
export default class AdminDelete implements OnInit {
  private readonly adminService = inject(AdminFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly pendingTasks = inject(PendingTasks);

  public readonly page = signal<CmsPage | null>(null);
  public readonly isDeleting = signal(false);
  public readonly error = signal<string | null>(null);

  public async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    const done = this.pendingTasks.add();
    this.error.set(null);
    try {
      const data = await this.adminService.getPage(id);
      this.page.set(data);
    } catch (err) {
      const message =
        err instanceof Error && err.message ? err.message : 'Failed to load page.';
      this.error.set(message);
    } finally {
      done();
    }
  }

  public async onDelete(): Promise<void> {
    const id = this.page()?.id;
    if (!id) return;
    this.error.set(null);
    this.isDeleting.set(true);
    try {
      const urls = await this.adminService.getUrls();
      const relatedUrls = urls.filter((u: CmsUrl) => u.page_id === id);
      for (const url of relatedUrls) {
        await this.adminService.deleteUrl(url.id);
      }
      await this.adminService.deletePage(id);
      await this.router.navigate(['/admin', this.page()?.lang || '']);
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'Error deleting page. Please try again.';
      this.error.set(message);
    } finally {
      this.isDeleting.set(false);
    }
  }

  public onCancel(): void {
    void this.router.navigate(['/admin']);
  }
}
