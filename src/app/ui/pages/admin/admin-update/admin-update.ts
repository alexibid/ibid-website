import { ChangeDetectionStrategy, Component, OnInit, PendingTasks, ViewChild, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminFacade } from '../../../../application/facades/admin.facade';
import { CmsPage, CmsPagePayload, CmsUrl } from '../../../../domain/models/cms.interface';
import { AdminForm } from '../admin-form/admin-form';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'website-admin-update',
  standalone: true,
  imports: [AdminForm],
  template: `
    <div class="admin-page">
      <header class="admin-header">
        <h2>Edit Page</h2>
        <div class="header-actions">
          <button
            type="button"
            class="btn-view"
            (click)="saveAndView()"
            [disabled]="!page() || isSaving()"
          >
            {{ isSaving() ? 'Saving...' : 'Save and View Page' }}
          </button>
        </div>
      </header>

      @if (error()) {
        <div class="error-message" role="alert">{{ error() }}</div>
      }

      @if (page()) {
        <website-admin-form
          #adminForm
          [initialData]="page()"
          (save)="onSave($event)"
          (cancel)="onCancel()"
        ></website-admin-form>
      } @else if (!error()) {
        <p class="loading-text">Loading page data...</p>
      }
    </div>
  `,
  styles: [`
    .admin-header {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 12px;
      margin-bottom: 20px;
    }
    h2 {
      margin: 0;
      color: #0f172a;
      font-size: 1.5rem;
    }
    .header-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }
    .btn-view {
      background: #1d4ed8;
      color: #ffffff;
      border: none;
      padding: 10px 20px;
      min-height: 44px;
      min-width: 44px;
      border-radius: 4px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-view:disabled {
      background: #94a3b8;
      cursor: not-allowed;
    }
    .btn-view:hover:not(:disabled) {
      background: #1e40af;
    }
    .btn-view:focus-visible {
      outline: 2px solid #1d4ed8;
      outline-offset: 2px;
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
    .loading-text {
      color: #475569;
    }
    @media (min-width: 768px) {
      .admin-header {
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
      }
      h2 {
        font-size: 1.75rem;
      }
    }
  `]
})
export default class AdminUpdate implements OnInit {
  private readonly adminService = inject(AdminFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly pendingTasks = inject(PendingTasks);

  @ViewChild('adminForm') public adminForm?: AdminForm;

  public readonly page = signal<CmsPage | null>(null);
  public readonly isSaving = signal(false);
  public readonly error = signal<string | null>(null);
  private shouldViewAfterSave = false;

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

  public async onSave(data: CmsPagePayload): Promise<void> {
    const id = this.page()?.id;
    if (!id) return;
    this.error.set(null);
    this.isSaving.set(true);
    try {
      await this.adminService.updatePage(id, data);

      if (this.shouldViewAfterSave) {
        const urls = await this.adminService.getUrls();
        const urlRecord = urls.find((u: CmsUrl) => u.page_id === id);
        if (urlRecord) {
          const fullUrl = '/' + urlRecord.lang + (urlRecord.url ? '/' + urlRecord.url : '');
          window.open(fullUrl, '_blank');
        }
        this.shouldViewAfterSave = false;
      } else {
        await this.router.navigate(['/admin', data.lang]);
      }
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'Error updating page. Please try again.';
      this.error.set(message);
      this.shouldViewAfterSave = false;
    } finally {
      this.isSaving.set(false);
    }
  }

  public saveAndView(): void {
    if (this.adminForm) {
      this.shouldViewAfterSave = true;
      this.adminForm.submit();
    }
  }

  public onCancel(): void {
    void this.router.navigate(['/admin']);
  }
}
