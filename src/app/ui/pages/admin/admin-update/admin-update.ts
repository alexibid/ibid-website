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
    <div class="admin-update">
      <header class="admin-header">
        <h2 class="admin-header__title">Edit Page</h2>
        <div class="admin-header__actions">
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
          [isPublishable]="isPublishable()"
          [isPublishing]="isPublishing()"
          (save)="onSave($event)"
          (publish)="onPublish()"
          (edited)="isPublishable.set(false)"
          (cancel)="onCancel()"
        ></website-admin-form>
      } @else if (!error()) {
        <p class="admin-update__loading">Loading page data...</p>
      }
    </div>
  `,
  styles: [`
    .admin-header {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 12px;
      margin-bottom: 16px;

      @media (min-width: 768px) {
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
      }

      &__title {
        margin: 0;
        font-family: var(--font-sans);
        color: #0f172a;
        font-size: 1.5rem;
        font-weight: 600;

        @media (min-width: 768px) {
          font-size: 1.75rem;
        }
      }

      &__actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
    }
    .btn-view {
      background: #1d4ed8;
      color: #ffffff;
      border: none;
      padding: 0.375rem 0.875rem;
      min-height: 36px;
      min-width: auto;
      border-radius: 6px;
      font-family: var(--font-sans);
      font-size: 0.875rem;
      line-height: 1.25;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 0.2s ease;

      &:disabled {
        background: #94a3b8;
        cursor: not-allowed;
      }

      &:hover:not(:disabled) {
        background: #1e40af;
      }

      &:focus-visible {
        outline: 2px solid #1d4ed8;
        outline-offset: 2px;
      }

      @media (prefers-reduced-motion: reduce) {
        transition: none;
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
    .admin-update {
      &__loading {
        color: #475569;
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
  public readonly isPublishable = signal(false);
  public readonly isPublishing = signal(false);
  private shouldViewAfterSave = false;

  public async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    const done = this.pendingTasks.add();
    this.error.set(null);
    try {
      const data = await this.adminService.getPage(id);
      this.page.set(data);
      this.isPublishable.set(true);
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
      this.page.set(await this.adminService.updatePage(id, data));
      this.adminForm?.markSaved();
      this.isPublishable.set(true);

      if (this.shouldViewAfterSave) {
        const urls = await this.adminService.getUrls();
        const urlRecord = urls.find((u: CmsUrl) => u.page_id === id);
        if (urlRecord) {
          const fullUrl = '/' + urlRecord.lang + (urlRecord.url ? '/' + urlRecord.url : '');
          window.open(fullUrl, '_blank');
        }
        this.shouldViewAfterSave = false;
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

  public async onPublish(): Promise<void> {
    this.error.set(null);
    this.isPublishing.set(true);
    try {
      await this.adminService.publishSite();
      this.isPublishable.set(false);
    } catch (err) {
      this.error.set(
        err instanceof Error && err.message ? err.message : 'Failed to publish the site.'
      );
    } finally {
      this.isPublishing.set(false);
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
