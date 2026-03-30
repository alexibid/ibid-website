import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
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
  private readonly route = inject(ActivatedRoute);

  // Língua selecionada
  public lang = signal<string>('');

  // Estado global dos dados e de loading
  public isLoading = signal(true);
  private allUrls = signal<CmsUrl[]>([]);

  // Sinais computados para separar a informação de forma limpa pelo 'type' do Model
  private filteredUrls = computed(() => 
    this.allUrls().filter(u => u.lang === this.lang())
  );

  public homeUrls = computed(() => this.filteredUrls().filter(u => u.expand?.page_id?.type === PageType.Home));
  public chapterUrls = computed(() => this.filteredUrls().filter(u => u.expand?.page_id?.type === PageType.Chapter));
  public exitUrls = computed(() => this.filteredUrls().filter(u => u.expand?.page_id?.type === PageType.Exit));

  async ngOnInit() {
    this.lang.set(this.route.snapshot.paramMap.get('lang') || '');
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
}
