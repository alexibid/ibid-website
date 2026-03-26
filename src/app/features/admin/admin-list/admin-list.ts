import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UpperCasePipe } from '@angular/common';
import { PocketbaseService } from '../../../core/services/pocketbase.service';
import { CmsUrl } from '../../../core/models/cms.interface';
import { PageType } from '../../../core/models/page-type.enum';

@Component({
  selector: 'app-admin-list',
  imports: [RouterLink, UpperCasePipe],
  templateUrl: './admin-list.html',
  styleUrl: './admin-list.scss',
})
export default class AdminList implements OnInit {
  private readonly pbService = inject(PocketbaseService);

  // Estado global dos dados e de loading
  public isLoading = signal(true);
  private allUrls = signal<CmsUrl[]>([]);

  // Sinais computados para separar a informação de forma limpa pelo 'type' do Model
  public homeUrls = computed(() => this.allUrls().filter(u => u.expand?.page_id?.type === PageType.Home));
  public chapterUrls = computed(() => this.allUrls().filter(u => u.expand?.page_id?.type === PageType.Chapter));
  public exitUrls = computed(() => this.allUrls().filter(u => u.expand?.page_id?.type === PageType.Exit));

  async ngOnInit() {
    try {
      // Pedimos ao Pocketbase a lista completa de URLs cruzada logo com as propriedades da Página final (Title, Type)
      const records = await this.pbService.pb.collection('urls').getFullList<CmsUrl>({
        expand: 'page_id'
      });
      
      this.allUrls.set(records);
    } catch (err) {
      console.error('Error fetching admin list data:', err);
      // Aqui poderíamos puxar o ui-error.service caso fizesse parte da dashboard
    } finally {
      this.isLoading.set(false);
    }
  }
}
