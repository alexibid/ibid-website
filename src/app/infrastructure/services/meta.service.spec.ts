import { DOCUMENT } from '@angular/common';
import { Component, PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { CONTENT_READ_REPOSITORY } from '../tokens/content-repository.token';
import { I18nService } from './i18n.service';
import { MetaService } from './meta.service';
import { RoutingService } from './routing.service';
import {
  ALL_SUPPORTED_LANGUAGE_CODES,
  createMockContentReadRepository
} from '../../../mocks/i18n.mock';

@Component({
  selector: 'website-meta-route-stub',
  standalone: true,
  template: ''
})
class MetaRouteStubComponent {}

describe('MetaService', () => {
  let router: Router;
  let metaService: MetaService;
  let i18nService: I18nService;
  let routingService: RoutingService;
  let doc: Document;
  let originalHtmlLang = '';

  beforeEach(async () => {
    originalHtmlLang = document.documentElement.lang;

    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: CONTENT_READ_REPOSITORY, useValue: createMockContentReadRepository() },
        provideRouter([
          { path: 'pt/prefacio', component: MetaRouteStubComponent, data: { title: 'Prefácio', lang: 'pt', location: 'preface' } },
          { path: 'en/preface', component: MetaRouteStubComponent, data: { title: 'Preface', lang: 'en', location: 'preface' } },
          { path: 'es/prefacio', component: MetaRouteStubComponent, data: { title: 'Prefacio', lang: 'es', location: 'preface' } },
          { path: 'fr/preface', component: MetaRouteStubComponent, data: { title: 'Préface', lang: 'fr', location: 'preface' } },
          { path: 'de/vorwort', component: MetaRouteStubComponent, data: { title: 'Vorwort', lang: 'de', location: 'preface' } },
          { path: 'not-found', component: MetaRouteStubComponent }
        ])
      ]
    });

    router = TestBed.inject(Router);
    metaService = TestBed.inject(MetaService);
    i18nService = TestBed.inject(I18nService);
    routingService = TestBed.inject(RoutingService);
    doc = TestBed.inject(DOCUMENT);

    await routingService.loadRoutes();
    metaService.init();
  });

  afterEach(() => {
    doc.querySelectorAll('link[rel="alternate"]').forEach((node) => node.remove());
    document.documentElement.lang = originalHtmlLang;
    document.cookie = 'ibid-lang=; path=/; max-age=0';
    window.history.replaceState(null, '', '/');
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('should update HTML lang attribute and i18n language for de and fr routes', async () => {
    await router.navigateByUrl('/de/vorwort');
    expect(i18nService.currentLangCode()).toBe('de');
    expect(doc.documentElement.lang).toBe('de');

    await router.navigateByUrl('/fr/preface');
    expect(i18nService.currentLangCode()).toBe('fr');
    expect(doc.documentElement.lang).toBe('fr');
  });

  it('should generate hreflang alternate links including de and fr across sequential navigations', async () => {
    await router.navigateByUrl('/de/vorwort');

    const alternateLinks = Array.from(doc.querySelectorAll('link[rel="alternate"]'));
    const hreflangs = alternateLinks.map((node) => node.getAttribute('hreflang'));

    for (const code of ALL_SUPPORTED_LANGUAGE_CODES) {
      expect(hreflangs).toContain(code);
    }
  });

  it('should handle routes without language metadata without throwing or clearing valid HTML lang', async () => {
    await router.navigateByUrl('/fr/preface');
    expect(doc.documentElement.lang).toBe('fr');

    await router.navigateByUrl('/not-found');
    expect(ALL_SUPPORTED_LANGUAGE_CODES).toContain(doc.documentElement.lang);
  });
});
