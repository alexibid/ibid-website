import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { I18nService } from '../../../../infrastructure/services/i18n.service';
import { RoutingService } from '../../../../infrastructure/services/routing.service';
import { CONTENT_READ_REPOSITORY } from '../../../../infrastructure/tokens/content-repository.token';
import {
  createPublishedBookRepository,
  PUBLISHED_BOOK
} from '../../../../../mocks/app-routes.mock';
import { Header } from './header';

@Component({
  selector: 'website-header-route-stub',
  standalone: true,
  template: ''
})
class HeaderRouteStubComponent {}

describe('Header', () => {
  let fixture: ComponentFixture<Header>;

  function host(): HTMLElement {
    const root: unknown = fixture.nativeElement;
    if (!(root instanceof HTMLElement)) throw new Error('Header root is not an HTMLElement');
    return root;
  }

  function logo(): HTMLButtonElement {
    const button = host().querySelector('button[aria-controls="bookmark-nav"]');
    if (!(button instanceof HTMLButtonElement)) throw new Error('Logo button not found');
    return button;
  }

  function isMenuOpen(): boolean {
    fixture.detectChanges();
    return logo().getAttribute('aria-expanded') === 'true';
  }

  function movePointer(type: 'pointerenter' | 'pointerleave', pointerType: string): void {
    const event = new Event(type);
    Object.defineProperty(event, 'pointerType', { value: pointerType });
    logo().parentElement?.dispatchEvent(event);
  }

  function menuLink(path: string): HTMLAnchorElement {
    const link = host().querySelector(`a[href="${path}"]`);
    if (!(link instanceof HTMLAnchorElement)) throw new Error(`Menu link not found: ${path}`);
    return link;
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [Header],
      providers: [
        provideRouter([{ path: '**', component: HeaderRouteStubComponent }]),
        { provide: CONTENT_READ_REPOSITORY, useValue: createPublishedBookRepository() }
      ]
    });
    TestBed.inject(I18nService).setLanguage(PUBLISHED_BOOK.lang);
    await TestBed.inject(RoutingService).loadRoutes();
    fixture = TestBed.createComponent(Header);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => {
    document.cookie = 'ibid-lang=; path=/; max-age=0';
    TestBed.resetTestingModule();
  });

  it('should link to the index and the pages without any # fragment, header logo included', async () => {
    logo().click();
    fixture.detectChanges();
    const hrefs = Array.from(host().querySelectorAll('a'), (link) => link.getAttribute('href'));

    expect(hrefs).toEqual(PUBLISHED_BOOK.menuLinks);
    expect(hrefs.join()).not.toContain('#');
    expect(logo().closest('a')).toBeNull();

    menuLink(PUBLISHED_BOOK.indexUrl).click();
    await fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe(PUBLISHED_BOOK.indexUrl);
    expect(isMenuOpen()).toBe(false);
  });

  it('should number the chapter entries in Roman numerals and keep their link names readable', () => {
    logo().click();
    fixture.detectChanges();
    const numerals = Array.from(host().querySelectorAll('.bookmark-nav__number'), (number) => number.textContent?.trim())
      .filter(Boolean);

    expect(numerals).toEqual(['I', 'III']);
    expect(menuLink(PUBLISHED_BOOK.chapterUrl).getAttribute('aria-label')).toBe(`I ${PUBLISHED_BOOK.chapterTitle}`);
    expect(menuLink(PUBLISHED_BOOK.indexUrl).getAttribute('aria-label')).toBe(PUBLISHED_BOOK.indexTitle);
  });

  it('should open the bookmark menu by click or mouse hover and close it by Escape or outside click', () => {
    expect(isMenuOpen()).toBe(false);

    logo().click();
    expect(isMenuOpen()).toBe(true);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(isMenuOpen()).toBe(false);

    logo().click();
    document.body.click();
    expect(isMenuOpen()).toBe(false);

    movePointer('pointerenter', 'mouse');
    expect(isMenuOpen()).toBe(true);
    movePointer('pointerleave', 'mouse');
    expect(isMenuOpen()).toBe(false);

    movePointer('pointerenter', 'touch');
    logo().click();
    movePointer('pointerleave', 'touch');
    expect(isMenuOpen()).toBe(true);
  });
});
