import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { I18nService } from '../../../infrastructure/services/i18n.service';
import { NotFound } from './not-found';

describe('NotFound', () => {
  let fixture: ComponentFixture<NotFound>;
  let i18n: I18nService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotFound],
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        provideRouter([])
      ]
    }).compileComponents();

    i18n = TestBed.inject(I18nService);
    fixture = TestBed.createComponent(NotFound);
    fixture.detectChanges();
  });

  afterEach(() => {
    document.cookie = 'ibid-lang=; path=/; max-age=0';
    TestBed.resetTestingModule();
  });

  function readTexts(): { title: string; message: string; back: string; href: string | null } {
    const root = fixture.nativeElement;
    if (!(root instanceof HTMLElement)) {
      return { title: '', message: '', back: '', href: null };
    }
    const h1 = root.querySelector('h1');
    const p = root.querySelector('p');
    const a = root.querySelector('a');
    return {
      title: h1?.textContent?.trim() ?? '',
      message: p?.textContent?.trim() ?? '',
      back: a?.textContent?.trim() ?? '',
      href: a?.getAttribute('href') ?? null
    };
  }

  it('should display localized error page content in German (de) and French (fr) without English fallback', () => {
    i18n.setLanguage('en');
    fixture.detectChanges();
    const enTexts = readTexts();

    i18n.setLanguage('de');
    fixture.detectChanges();
    expect(i18n.currentLangCode()).toBe('de');
    const deTexts = readTexts();
    expect(deTexts.title).not.toBe('');
    expect(deTexts.title).not.toBe('not-found.title');
    expect(deTexts.title).not.toBe(enTexts.title);
    expect(deTexts.message).not.toBe('');
    expect(deTexts.message).not.toBe('not-found.message');
    expect(deTexts.message).not.toBe(enTexts.message);
    expect(deTexts.back).not.toBe('');
    expect(deTexts.back).not.toBe('not-found.back');
    expect(deTexts.back).not.toBe(enTexts.back);
    expect(deTexts.href).toBe('/de');

    i18n.setLanguage('fr');
    fixture.detectChanges();
    expect(i18n.currentLangCode()).toBe('fr');
    const frTexts = readTexts();
    expect(frTexts.title).toBe('404 - Page non trouvée');
    expect(frTexts.message).toBe("Le contenu que vous recherchez n'existe pas ou a été déplacé.");
    expect(frTexts.back).toBe("Retour à l'accueil");
    expect(frTexts.href).toBe('/fr');
  });

  it('should render valid fallback text and home link when an invalid language code is attempted', () => {
    i18n.setLanguage('zz');
    fixture.detectChanges();

    const texts = readTexts();
    expect(texts.title.length).toBeGreaterThan(0);
    expect(texts.title).not.toBe('not-found.title');
    expect(texts.message.length).toBeGreaterThan(0);
    expect(texts.back.length).toBeGreaterThan(0);
    expect(texts.href).toBe(`/${i18n.currentLangCode()}`);
  });
});
