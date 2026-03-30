import { Component, inject, OnInit, signal, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { AdminForm } from '../admin-form';
import { CmsPage } from '../../../core/models/cms.interface';

@Component({
  selector: 'app-admin-update',
  standalone: true,
  imports: [AdminForm],
  template: `
    <div class="admin-page">
      <header class="admin-header">
        <h2>Editar Página</h2>
        <div class="header-actions">
          <button class="btn-view" (click)="saveAndView()" [disabled]="!page() || isSaving()">
            {{ isSaving() ? 'A Gravar...' : '💾 Gravar e Ver Página' }}
          </button>
        </div>
      </header>

      @if (page()) {
        <app-admin-form #adminForm [initialData]="page()" (save)="onSave($event)" (cancel)="onCancel()"></app-admin-form>
      } @else {
        <p>A carregar dados da página...</p>
      }
    </div>
  `,
  styles: [`
    .admin-page { max-width: 900px; margin: 0 auto; }
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
        console.error('Falha ao carregar página', error);
        this.router.navigate(['/admin']);
      }
    }
  }

  async onSave(data: any) {
    const id = this.page()?.id;
    if (id) {
      this.isSaving.set(true);
      try {
        await this.adminService.updatePage(id, data);
        
        if (this.shouldViewAfterSave) {
          const urls = await this.adminService.getUrls();
          const pageUrl = urls.find(u => u.page_id === id)?.url || '';
          window.open('/' + pageUrl, '_blank');
          this.shouldViewAfterSave = false;
          // Não navegamos para a lista, ficamos aqui
        } else {
          this.router.navigate(['/admin']);
        }
      } catch (error) {
        console.error('Falha ao atualizar página', error);
        alert('Erro ao atualizar. Verifique a consola.');
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
