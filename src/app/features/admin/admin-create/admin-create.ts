import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { AdminForm } from '../admin-form';

@Component({
  selector: 'app-admin-create',
  standalone: true,
  imports: [AdminForm],
  template: `
    <div class="admin-page">
      <h2>Criar Nova Página</h2>
      <app-admin-form (save)="onSave($event)" (cancel)="onCancel()"></app-admin-form>
    </div>
  `,
  styles: [`
    .admin-page { max-width: 900px; margin: 0 auto; }
    h2 { margin-bottom: 20px; color: #333; }
  `]
})
export default class AdminCreate {
  private adminService = inject(AdminService);
  private router = inject(Router);

  async onSave(data: any) {
    try {
      // 1. Criar a Página
      const page = await this.adminService.createPage(data);
      
      // 2. Criar o URL correspondente (Lógica simples: slug = title transformado)
      // Numa versão mais complexa, o utilizador escolheria o URL
      const slug = data.title.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, '-');
      
      await this.adminService.createUrl({
        url: slug,
        page_id: page.id,
        lang: data.lang
      });

      this.router.navigate(['/admin']);
    } catch (error) {
      console.error('Falha ao criar página', error);
      alert('Erro ao criar página. Verifique a consola.');
    }
  }

  onCancel() {
    this.router.navigate(['/admin']);
  }
}
