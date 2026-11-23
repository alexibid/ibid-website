import { DOCUMENT } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UI_I18N } from '../../domain/constants/ui-i18n';
import { I18nService, SUPPORTED_LANGUAGES } from './i18n.service';
import { ALL_SUPPORTED_LANGUAGE_CODES } from '../../../mocks/i18n.mock';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function clearLangCookie(doc: Document): void {
  doc.cookie = 'ibid-lang=; path=/; max-age=0';
}

describe('I18nService', () => {
  beforeEach(() => {
    clearLangCookie(document);
    localStorage.clear();
    sessionStorage.clear();
    window.history.replaceState(null, '', '/');
  });

  afterEach(() => {
    clearLangCookie(document);
    localStorage.clear();
    sessionStorage.clear();
    window.history.replaceState(null, '', '/');
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  function createService(platformId: string, cookieLang: string, browserLang: string): I18nService {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: platformId }]
    });
    const doc = TestBed.inject(DOCUMENT);
    clearLangCookie(doc);
    if (cookieLang) {
      doc.cookie = `ibid-lang=${cookieLang}; path=/`;
    }
    vi.spyOn(navigator, 'language', 'get').mockReturnValue(browserLang);
    return TestBed.inject(I18nService);
  }

  it('should recognize French (fr) in SUPPORTED_LANGUAGES and i18n service without falling back unexpectedly', () => {
    const service = createService('browser', '', 'fr-FR');
    const supported = TestBed.inject(SUPPORTED_LANGUAGES);

    expect(supported).toContain('fr');
    expect(service.currentLangCode()).toBe('fr');

    service.setLanguage('pt');
    service.setLanguage('fr');
    expect(service.currentLangCode()).toBe('fr');

    const ui = service.ui();
    expect(isRecord(ui)).toBe(true);
    if (isRecord(ui)) {
      expect(ui['close']).toBe('Fermer');
      expect(ui['chapter']).toBe('Chapitre');
      expect(ui['return']).toBe('Retour');
    }
  });

  it('should initialize from persisted cookie for de and fr without falling back', () => {
    const frService = createService('browser', 'fr', 'en-US');
    expect(frService.currentLangCode()).toBe('fr');

    const deService = createService('browser', 'de', 'en-US');
    expect(deService.currentLangCode()).toBe('de');
  });

  it('should fall back safely when given unsupported, empty, or unexpected language codes', () => {
    const service = createService('browser', '', 'xx-XX');
    expect(service.currentLangCode()).toBe('en');

    service.setLanguage('fr');
    expect(service.currentLangCode()).toBe('fr');

    service.setLanguage('');
    expect(ALL_SUPPORTED_LANGUAGE_CODES).toContain(service.currentLangCode());
    expect(service.currentLangCode()).not.toBe('');

    service.setLanguage('ja');
    expect(ALL_SUPPORTED_LANGUAGE_CODES).toContain(service.currentLangCode());
    expect(service.currentLangCode()).not.toBe('ja');

    service.setLanguage('DE');
    expect(ALL_SUPPORTED_LANGUAGE_CODES).toContain(service.currentLangCode());
  });

  it('should remain consistent across sequential language switches across all five supported languages', () => {
    const service = createService('browser', 'pt', 'pt-PT');

    for (const code of ALL_SUPPORTED_LANGUAGE_CODES) {
      service.setLanguage(code);
      expect(service.currentLangCode()).toBe(code);
      expect(service.ui()).toBe(UI_I18N[code]);
    }

    service.setLanguage('fr');
    expect(service.currentLangCode()).toBe('fr');
    service.setLanguage('de');
    expect(service.currentLangCode()).toBe('de');
  });
});
