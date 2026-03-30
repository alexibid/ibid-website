import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UpperCasePipe } from '@angular/common';
import { AdminService } from '../../../core/services/admin.service';
import { CmsUrl } from '../../../core/models/cms.interface';
import { PageType } from '../../../core/models/page-type.enum';

@Component({
  selector: 'app-admin-list',
  standalone: true,
  imports: [RouterLink, UpperCasePipe],
  templateUrl: './admin-list.html',
  styleUrl: './admin-list.scss',
})
export default class AdminList implements OnInit {
  private readonly adminService = inject(AdminService);

  // Estado global dos dados e de loading
  public isLoading = signal(true);
  private allUrls = signal<CmsUrl[]>([]);

  // Sinais computados para separar a informação de forma limpa pelo 'type' do Model
  public homeUrls = computed(() => this.allUrls().filter(u => u.expand?.page_id?.type === PageType.Home));
  public chapterUrls = computed(() => this.allUrls().filter(u => u.expand?.page_id?.type === PageType.Chapter));
  public exitUrls = computed(() => this.allUrls().filter(u => u.expand?.page_id?.type === PageType.Exit));

  async ngOnInit() {
    await this.loadData();
  }

  async loadData() {
    this.isLoading.set(true);
    try {
      // Pedimos ao Pocketbase a lista completa de URLs cruzada logo com as propriedades da Página final (Title, Type)
      const records = await this.adminService.getUrls();
      this.allUrls.set(records);
    } catch (err) {
      console.error('Error fetching admin list data:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  async fixContent() {
    if (confirm('Deseja executar a manutenção da base de dados? Esta ação irá remover tags de imagem corrompidas.')) {
      try {
        const count = await this.adminService.fixAllContent();
        alert(`Manutenção concluída! ${count} páginas foram corrigidas.`);
        await this.loadData();
      } catch (err) {
        console.error('Erro na manutenção:', err);
        alert('Ocorreu um erro ao corrigir a BD.');
      }
    }
  }
}
