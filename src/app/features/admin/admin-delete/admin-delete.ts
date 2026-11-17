import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { CmsPage } from '../../../shared/types/cms.interface';

@Component({
  selector: 'app-admin-delete',
  standalone: true,
  template: `
    <div class="delete-confirm">
      <h2>Delete Page</h2>
      @if (page()) {
        <p>Are you sure you want to delete the page <strong>"{{ page()?.title }}"</strong>?</p>
        <p class="warning">Warning: This action will also delete all URLs associated with this page.</p>
        
        <div class="actions">
          <button class="btn-cancel" (click)="onCancel()">Cancel</button>
          <button class="btn-danger" (click)="onDelete()">Confirm Delete</button>
        </div>
      } @else {
        <p>Loading data...</p>
      }
    </div>
  `,
  styles: [`
    .delete-confirm { max-width: 600px; margin: 40px auto; padding: 30px; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    h2 { color: #e74c3c; margin-bottom: 20px; }
    .warning { color: #666; font-size: 0.9rem; margin: 20px 0; padding: 10px; background: #fff5f5; border-left: 4px solid #e74c3c; }
    .actions { display: flex; justify-content: flex-end; gap: 15px; margin-top: 30px; }
    button { padding: 12px 24px; border-radius: 4px; font-weight: 600; cursor: pointer; border: none; }
    .btn-cancel { background: #f8f9fa; color: #333; border: 1px solid #ddd; }
    .btn-danger { background: #e74c3c; color: white; }
  `]
})
export default class AdminDelete implements OnInit {
  private adminService = inject(AdminService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  public page = signal<CmsPage | null>(null);

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      try {
        const data = await this.adminService.getPage(id);
        this.page.set(data);
      } catch {
        this.router.navigate(['/admin']);
      }
    }
  }

  async onDelete() {
    const id = this.page()?.id;
    if (id) {
      try {
        const urls = await this.adminService.getUrls();
        const relatedUrls = urls.filter(u => u.page_id === id);
        
        for (const url of relatedUrls) {
          await this.adminService.deleteUrl(url.id);
        }

        await this.adminService.deletePage(id);
        this.router.navigate(['/admin', this.page()?.lang || '']);
      } catch (error) {
        console.error('Delete failed', error);
        alert('Error deleting page. Please check the console.');
      }
    }
  }

  onCancel() {
    this.router.navigate(['/admin']);
  }
}
