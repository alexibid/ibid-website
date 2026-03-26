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
    
    // Guarda de Segurança SSR (Server-Side Rendering): 
    // Garante que só guarda no browser (o Servidor Node não tem localStorage)
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('ibid-preferred-lang', lang);
    }
  }

  private detectLanguage() {
    // 1. Verificar se o utilizador já forçou previamente uma língua
    if (typeof localStorage !== 'undefined') {
      const savedLang = localStorage.getItem('ibid-preferred-lang');
      if (savedLang) {
        this.currentLangCode.set(savedLang);
        return;
      }
    }

    // 2. Se for uma visita nova, deteta gentilmente a língua original do browser
    if (typeof navigator === 'undefined') return;
    const browserLang = navigator.language.split('-')[0];
    const supportedLangs = ['pt', 'en', 'es', 'fr'];
    this.currentLangCode.set(supportedLangs.includes(browserLang) ? browserLang : 'en');
  }
}
