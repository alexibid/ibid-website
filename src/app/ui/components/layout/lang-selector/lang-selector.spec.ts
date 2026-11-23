import { Component, PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router, RouterOutlet } from '@angular/router';
import { CONTENT_READ_REPOSITORY } from '../../../../infrastructure/tokens/content-repository.token';
import { I18nService } from '../../../../infrastructure/services/i18n.service';
import { RoutingService } from '../../../../infrastructure/services/routing.service';
import { LangSelector } from './lang-selector';
import { createMockContentReadRepository } from '../../../../../mocks/i18n.mock';

@Component({
  selector: 'website-route-stub',
  standalone: true,
  template: ''
})
class RouteStubComponent {}

@Component({
  selector: 'website-lang-selector-host',
  standalone: true,
  imports: [LangSelector, RouterOutlet],
  template: '<website-lang-selector /><router-outlet />'
})
class LangSelectorHostComponent {}

describe('LangSelector', () => {
  let fixture: ComponentFixture<LangSelectorHostComponent>;
  let router: Router;
  let i18n: I18nService;
  let routingService: RoutingService;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [LangSelectorHostComponent],
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: CONTENT_READ_REPOSITORY, useValue: createMockContentReadRepository() },
        provideRouter([
          { path: '', component: RouteStubComponent, data: { location: 'front-cover', lang: 'pt' } },
          { path: 'pt/prefacio', component: RouteStubComponent, data: { location: 'preface', lang: 'pt' } },
          { path: 'en/preface', component: RouteStubComponent, data: { location: 'preface', lang: 'en' } },
          { path: 'es/prefacio', component: RouteStubComponent, data: { location: 'preface', lang: 'es' } },
          { path: 'fr/preface', component: RouteStubComponent, data: { location: 'preface', lang: 'fr' } },
          { path: 'de/vorwort', component: RouteStubComponent, data: { location: 'preface', lang: 'de' } },
          { path: 'de', component: RouteStubComponent, data: { location: 'front-cover', lang: 'de' } },
          { path: 'fr', component: RouteStubComponent, data: { location: 'front-cover', lang: 'fr' } },
          { path: 'en', component: RouteStubComponent, data: { location: 'front-cover', lang: 'en' } },
          { path: 'es', component: RouteStubComponent, data: { location: 'front-cover', lang: 'es' } }
        ])
      ]
    });

    router = TestBed.inject(Router);
    i18n = TestBed.inject(I18nService);
    routingService = TestBed.inject(RoutingService);
    await routingService.loadRoutes();
    await router.navigateByUrl('/pt/prefacio');

    fixture = TestBed.createComponent(LangSelectorHostComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    document.cookie = 'ibid-lang=; path=/; max-age=0';
    window.history.replaceState(null, '', '/');
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  function getOptionByLabel(label: string): HTMLElement | undefined {
    const element = fixture.nativeElement;
    if (!(element instanceof HTMLElement)) {
      return undefined;
    }
    const options = Array.from(element.querySelectorAll('.lang-dropdown button.lang-selector__option'));
    const match = options.find((node) => node.textContent?.trim().toUpperCase() === label.toUpperCase());
    return match instanceof HTMLElement ? match : undefined;
  }

  it('should display German (de) as selectable in the language selector and navigate to localized German route', async () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    const deOption = getOptionByLabel('DE');

    expect(deOption).toBeDefined();
    deOption?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(i18n.currentLangCode()).toBe('de');
    expect(navigateSpy).toHaveBeenCalledWith(['/de/vorwort']);

    const currentLangEl = fixture.nativeElement instanceof HTMLElement
      ? fixture.nativeElement.querySelector('.current-lang')
      : null;
    expect(currentLangEl?.textContent?.trim()).toBe('DE');
    expect(deOption?.classList.contains('active')).toBe(true);
  });

  it('should fall back to language root route when translation map has no matching location', async () => {
    routingService.translationMap.clear();
    const navigateSpy = vi.spyOn(router, 'navigate');

    const deOption = getOptionByLabel('DE');
    expect(deOption).toBeDefined();
    deOption?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(i18n.currentLangCode()).toBe('de');
    expect(navigateSpy).toHaveBeenCalledWith(['/', 'de']);
  });
});
