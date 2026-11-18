import {Component, inject, OnInit, signal, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminService } from '../../../../core/services/admin.service';
import { AdminForm } from '../admin-form/admin-form';
import { CmsPage, CmsPagePayload } from '../../../../shared/types/cms.interface';

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
          <button class="btn-view" (click)="saveAndView()" [disabled]="!page() || isSaving()">
            {{ isSaving() ? 'Saving...' : '💾 Save and View Page' }}
          </button>
        </div>
      </header>

      @if (page()) {
        <website-admin-form #adminForm [initialData]="page()" (save)="onSave($event)" (cancel)="onCancel()"></website-admin-form>
      } @else {
        <p>Loading page data...</p>
      }
    </div>
  `,
  styles: [`
    .admin-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    h2 { margin: 0; color: #333; }
    .btn-view { 
      background: #3498db; color: white; border: none; padding: 10px 20px; 
      border-radius: 4px; font-weight: 600; cursor: pointer;
    }
    .btn-view:disabled { background: #bdc3c7; cursor: not-allowed; }
    .btn-view:hover:not(:disabled) { background: #2980b9; }
  `]
})
export default class AdminUpdate implements OnInit {
  private adminService = inject(AdminService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  @ViewChild('adminForm') adminForm!: AdminForm;

  public page = signal<CmsPage | null>(null);
  public isSaving = signal(false);
  private shouldViewAfterSave = false;

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      try {
        const data = await this.adminService.getPage(id);
        this.page.set(data);
      } catch (error) {
        console.error('Failed to load page', error);
        this.router.navigate(['/admin']);
      }
    }
  }

  async onSave(data: CmsPagePayload) {
    const id = this.page()?.id;
    if (id) {
      this.isSaving.set(true);
      try {
        await this.adminService.updatePage(id, data);
        
        if (this.shouldViewAfterSave) {
          const urls = await this.adminService.getUrls();
          const urlRecord = urls.find(u => u.page_id === id);
          if (urlRecord) {
            const pageUrl = urlRecord.url;
            const pageLang = urlRecord.lang;
            const fullUrl = '/' + pageLang + (pageUrl ? '/' + pageUrl : '');
            window.open(fullUrl, '_blank');
          }
          this.shouldViewAfterSave = false;
        } else {
          this.router.navigate(['/admin', data.lang]);
        }
      } catch (error) {
        console.error('Failed to update page', error);
        alert('Error updating page. Please check the console.');
      } finally {
        this.isSaving.set(false);
      }
    }
  }

  async saveAndView() {
    if (this.adminForm) {
      this.shouldViewAfterSave = true;
      this.adminForm.submit();
    }
  }

  onCancel() {
    this.router.navigate(['/admin']);
  }
}
