import { Injectable, signal, computed } from '@angular/core';
import { UI_I18N } from '../data/ui-i18n';

@Injectable({
  providedIn: 'root'
})
export class I18nService {
  currentLangCode = signal<string>('pt');

  // Sinal computado que devolve as traduções para a língua atual
  ui = computed(() => UI_I18N[this.currentLangCode()] || UI_I18N['en']);

  constructor() {
    this.detectLanguage();
  }

  setLanguage(lang: string) {
    this.currentLangCode.set(lang);
  }

  private detectLanguage() {
    if (typeof navigator === 'undefined') return;
    const browserLang = navigator.language.split('-')[0];
    const supportedLangs = ['pt', 'en', 'es', 'fr'];
    this.currentLangCode.set(supportedLangs.includes(browserLang) ? browserLang : 'en');
  }
}
