import { Component, inject, signal, OnInit, effect, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { PocketbaseService } from '../../core/services/pocketbase.service';
import { I18nService } from '../../core/services/i18n.service';
import { PageType } from '../../core/models/page-type.enum';

@Component({
  selector: 'app-home',
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly pbService = inject(PocketbaseService);
  private readonly i18n = inject(I18nService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  // Array que vai guardar os 3 "spreads" (inicio, indice, prefacio) todos juntos
  protected readonly homeSections = signal<any[]>([]);
  
  // Guardamos qual foi a âncora que o utilizador pediu pelo Router (ex: 'index')
  protected anchorTarget = '';

  constructor() {
    // Sempre que a linguagem mudar, refazemos a pesquisa à DB!
    effect(() => {
      const lang = this.i18n.currentLangCode();
      this.loadAllHomeSections(lang);
    });
  }

  ngOnInit(): void {
    // Escuta mudanças nos dados da rota APENAS para descobrir para onde fazer Scroll!
    this.route.data.subscribe(data => {
      if (data && data['location']) {
        this.anchorTarget = data['location'];
        this.triggerScroll();
      }
    });
  }

  private async loadAllHomeSections(lang: string) {
    try {
      const records = await this.pbService.pb.collection('pages').getFullList({
        filter: `type = '${PageType.Home}' && lang = '${lang}'`,
        sort: 'metadata.old_id' // Garante que vêm ordenados (1, 2, 3...)
      });
      
      this.homeSections.set(records);
      
      // Depois de renderizar, tenta rolar até à âncora correta se tiver sido pedida
      setTimeout(() => this.triggerScroll(), 100);
    } catch (e) {
      console.error('Failed to load combined home sections', e);
    }
  }

  private triggerScroll() {
    if (!this.isBrowser || !this.anchorTarget) return;
    
    // Procura o id gerado no HTML (que será "front-cover", "index" ou "preface")
    const el = document.getElementById(this.anchorTarget);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
