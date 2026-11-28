import { Injectable, InjectionToken, signal, computed, PLATFORM_ID, inject } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { UI_I18N } from '../../domain/constants/ui-i18n';
import { SUPPORTED_LANGUAGE_CODES, normalizeLanguageCode } from '../../domain/constants/languages';
import { isRecord } from '../../domain/models/static-routes.model';

export type TranslationTables = Readonly<Record<string, unknown>>;

export const SUPPORTED_LANGUAGES = new InjectionToken<string[]>('SUPPORTED_LANGUAGES', {
  factory: () => [...SUPPORTED_LANGUAGE_CODES],
});

@Injectable({
  providedIn: 'root'
})
export class I18nService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly document = inject(DOCUMENT);
  public readonly supportedLanguages = inject(SUPPORTED_LANGUAGES);

  currentLangCode = signal<string>('pt');
  private readonly namespaces = signal<Readonly<Record<string, TranslationTables>>>({});
  ui = computed(() => this.withNamespaces(UI_I18N[this.currentLangCode()] || UI_I18N['en']));

  constructor() {
    this.detectLanguage();
  }

  registerNamespace(name: string, tables: TranslationTables): void {
    if (this.namespaces()[name] === tables) return;
    this.namespaces.update((current) => ({ ...current, [name]: tables }));
  }

  setLanguage(lang: string): void {
    const normalized = normalizeLanguageCode(lang);
    if (!this.supportedLanguages.includes(normalized)) {
      return;
    }
    this.currentLangCode.set(normalized);
    this.document.documentElement.lang = normalized;
    if (this.isBrowser) {
      const maxAge = 365 * 24 * 60 * 60;
      this.document.cookie = `ibid-lang=${normalized}; path=/; max-age=${maxAge}; samesite=lax`;
    }
  }

  private withNamespaces(base: unknown): unknown {
    const entries = Object.entries(this.namespaces());
    if (entries.length === 0 || !isRecord(base)) return base;
    const lang = this.currentLangCode();
    return entries.reduce<Record<string, unknown>>(
      (merged, [name, tables]) => ({ ...merged, [name]: tables[lang] ?? tables['en'] }),
      { ...base }
    );
  }

  private detectLanguage(): void {
    if (!this.isBrowser) {
      this.currentLangCode.set('pt');
      this.document.documentElement.lang = 'pt';
      return;
    }
    const match = this.document.cookie.match(/(?:^| )ibid-lang=([^;]+)/);
    if (match?.[1]) {
      const cookieLang = normalizeLanguageCode(match[1]);
      if (this.supportedLanguages.includes(cookieLang)) {
        this.currentLangCode.set(cookieLang);
        this.document.documentElement.lang = cookieLang;
        return;
      }
    }
    const browserLang = normalizeLanguageCode(navigator.language || '');
    const detected = this.supportedLanguages.includes(browserLang) ? browserLang : 'en';
    this.currentLangCode.set(detected);
    this.document.documentElement.lang = detected;
  }
}
