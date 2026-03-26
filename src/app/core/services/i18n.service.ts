import { Injectable, signal, computed, PLATFORM_ID, inject } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { UI_I18N } from '../data/ui-i18n';

@Injectable({
  providedIn: 'root'
})
export class I18nService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly document = inject(DOCUMENT);
  
  currentLangCode = signal<string>('pt');

  // Sinal computado que devolve as traduções para a língua atual
  ui = computed(() => UI_I18N[this.currentLangCode()] || UI_I18N['en']);

  constructor() {
    this.detectLanguage();
  }

  setLanguage(lang: string) {
    this.currentLangCode.set(lang);
    
    // Guarda de Segurança SSR (Server-Side Rendering): 
    // Garante que só guarda no browser (o Servidor Node não tem localStorage real mapeado)
    if (this.isBrowser) {
      // Usamos First-Party Cookies (Muito mais robusto que LocalStorage, previne purgas e permite leitura no Servidor Node SSR)
      const maxAge = 365 * 24 * 60 * 60; // 1 year
      this.document.cookie = `ibid-lang=${lang}; path=/; max-age=${maxAge}; samesite=lax`;
    }
  }

  private detectLanguage() {
    if (!this.isBrowser) {
      this.currentLangCode.set('pt'); // Default seguro para SSR Server Side
      return;
    }

    // 1. Tentar extrair a preferência vinda dos Cookies
    const match = this.document.cookie.match(new RegExp('(^| )ibid-lang=([^;]+)'));
    if (match && match[2]) {
      this.currentLangCode.set(match[2]);
      return;
    }

    // 2. Se for uma visita nova, deteta gentilmente a língua original do browser
    const browserLang = navigator.language.split('-')[0];
    const supportedLangs = ['pt', 'en', 'es', 'fr'];
    this.currentLangCode.set(supportedLangs.includes(browserLang) ? browserLang : 'en');
  }
}
