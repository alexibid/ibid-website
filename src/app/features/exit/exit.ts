import { Component, inject, signal, OnInit, effect, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { PocketbaseService } from '../../core/services/pocketbase.service';
import { I18nService } from '../../core/services/i18n.service';
import { PageType } from '../../core/models/page-type.enum';

@Component({
  selector: 'app-exit',
  imports: [],
  templateUrl: './exit.html',
  styleUrl: './exit.scss',
})
export class Exit implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly pbService = inject(PocketbaseService);
  private readonly i18n = inject(I18nService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly exitSections = signal<any[]>([]);
  protected anchorTarget = '';

  constructor() {
    effect(() => {
      const lang = this.i18n.currentLangCode();
      this.loadAllExitSections(lang);
    });
  }

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      if (data && data['location']) {
        this.anchorTarget = data['location'];
        this.triggerScroll();
      }
    });
  }

  private async loadAllExitSections(lang: string) {
    try {
      const records = await this.pbService.pb.collection('pages').getFullList({
        filter: `type = '${PageType.Exit}' && lang = '${lang}'`
      });
      
      // Ordem arquitetural ditada para as páginas de Exit, independentemente da ordem em que foram criadas no CMS
      const structuralOrder = ['contact-form', 'about', 'back-cover'];
      
      records.sort((a, b) => {
        const locA = a['metadata']?.['location'];
        const locB = b['metadata']?.['location'];
        const orderA = structuralOrder.indexOf(locA) !== -1 ? structuralOrder.indexOf(locA) : 99;
        const orderB = structuralOrder.indexOf(locB) !== -1 ? structuralOrder.indexOf(locB) : 99;
        return orderA - orderB;
      });
      
      this.exitSections.set(records);
      setTimeout(() => this.triggerScroll(), 100);
    } catch (e) {
      console.error('Failed to load combined exit sections', e);
    }
  }

  private triggerScroll() {
    if (!this.isBrowser || !this.anchorTarget) return;
    const el = document.getElementById(this.anchorTarget);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
