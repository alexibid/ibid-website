import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { CmsPage } from '../../../core/models/cms.interface';

@Component({
  selector: 'app-admin-delete',
  standalone: true,
  template: `
    <div class="delete-confirm">
      <h2>Eliminar Página</h2>
      @if (page()) {
        <p>Tem a certeza que deseja eliminar a página <strong>"{{ page()?.title }}"</strong>?</p>
        <p class="warning">Aviso: Esta ação também eliminará todos os URLs associados a esta página.</p>
        
        <div class="actions">
          <button class="btn-cancel" (click)="onCancel()">Cancelar</button>
          <button class="btn-danger" (click)="onDelete()">Confirmar Eliminação</button>
        </div>
      } @else {
        <p>A carregar dados...</p>
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
      } catch (error) {
        this.router.navigate(['/admin']);
      }
    }
  }

  async onDelete() {
    const id = this.page()?.id;
    if (id) {
      try {
        // PocketBase deletes related records if configured with Cascade (usually requires manual or specific rule)
        // For simplicity, we delete the page.
        // If URLs are linked via 'page_id', they should be handled too.
        
        // Let's find URLs for this page first
        const urls = await this.adminService.getUrls();
        const relatedUrls = urls.filter(u => u.page_id === id);
        
        for (const url of relatedUrls) {
          await this.adminService.deleteUrl(url.id);
        }

        await this.adminService.deletePage(id);
        this.router.navigate(['/admin']);
      } catch (error) {
        console.error('Falha ao eliminar', error);
        alert('Erro ao eliminar. Verifique a consola.');
      }
    }
  }

  onCancel() {
    this.router.navigate(['/admin']);
  }
}
