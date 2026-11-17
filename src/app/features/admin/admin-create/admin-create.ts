import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { AdminForm } from '../admin-form/admin-form';
import { CmsPagePayload } from '../../../shared/types/cms.interface';

@Component({
  selector: 'app-admin-create',
  standalone: true,
  imports: [AdminForm],
  template: `
    <div class="admin-page">
      <h2>Create New Page</h2>
      <app-admin-form (save)="onSave($event)" (cancel)="onCancel()"></app-admin-form>
    </div>
  `,
  styles: [`
    h2 { margin-bottom: 20px; color: #333; }
  `]
})
export default class AdminCreate {
  private adminService = inject(AdminService);
  private router = inject(Router);

  async onSave(data: CmsPagePayload) {
    try {
      const page = await this.adminService.createPage(data);
      
      const slug = data.title.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, '-');
      
      await this.adminService.createUrl({
        url: slug,
        page_id: page.id,
        lang: data.lang
      });

      this.router.navigate(['/admin', data.lang]);
    } catch (error) {
      console.error('Failed to create page', error);
      alert('Error creating page. Please check the console.');
    }
  }

  onCancel() {
    this.router.navigate(['/admin']);
  }
}
