import { Injectable, signal, computed, PLATFORM_ID, inject } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { UI_I18N } from '../../shared/constants/ui-i18n';
import { SUPPORTED_LANGUAGES } from '../tokens/api.tokens';

@Injectable({
  providedIn: 'root'
})
export class I18nService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly document = inject(DOCUMENT);
  private readonly supportedLanguages = inject(SUPPORTED_LANGUAGES);

  currentLangCode = signal<string>('pt');
  ui = computed(() => UI_I18N[this.currentLangCode()] || UI_I18N['en']);

  constructor() {
    this.detectLanguage();
  }

  setLanguage(lang: string) {
    this.currentLangCode.set(lang);
    if (this.isBrowser) {
      const maxAge = 365 * 24 * 60 * 60;
      this.document.cookie = `ibid-lang=${lang}; path=/; max-age=${maxAge}; samesite=lax`;
    }
  }

  private detectLanguage() {
    if (!this.isBrowser) {
      this.currentLangCode.set('pt');
      return;
    }
    const match = this.document.cookie.match(new RegExp('(^| )ibid-lang=([^;]+)'));
    if (match && match[2]) {
      this.currentLangCode.set(match[2]);
      return;
    }
    const browserLang = navigator.language.split('-')[0];
    this.currentLangCode.set(this.supportedLanguages.includes(browserLang) ? browserLang : 'en');
  }
}
