import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ContentEntry } from '../models/content.model';

@Injectable({
  providedIn: 'root'
})
export class LocaleService {
  private platformId = inject(PLATFORM_ID);

  getBestHomeSlug(availableHomes: ContentEntry[]): string {
    const fallback = availableHomes.find(h => h.lang === 'en') || availableHomes[0];
    if (!isPlatformBrowser(this.platformId)) return fallback?.slug || '';

    try {
      const locale = new Intl.NumberFormat(navigator.languages).resolvedOptions().locale;
      const userLangCode = locale.split('-')[0];
      const match = availableHomes.find(h => h.lang === userLangCode);
      return match ? match.slug : (fallback?.slug || '');
    } catch {
      return fallback?.slug || '';
    }
  }
}
