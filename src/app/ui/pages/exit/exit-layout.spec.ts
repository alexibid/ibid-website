import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BookService } from '../../../infrastructure/services/book.service';
import { ANTI_SPAM_TOKEN_PORT } from '../../../infrastructure/tokens/contact.tokens';
import { CONTENT_READ_REPOSITORY } from '../../../infrastructure/tokens/content-repository.token';
import { CONTACT_HTTP_FIXTURES, CONTACT_LAYOUT_FIXTURES } from '../../../../mocks/contact-form.mock';
import { createMockContentReadRepository } from '../../../../mocks/static-html.mock';
import { BookNavigationDirective } from '../../directives/book-navigation.directive';
import { Exit } from './exit';

function requireHost(fixture: ComponentFixture<Exit>): HTMLElement {
  const root: unknown = fixture.nativeElement;
  if (!(root instanceof HTMLElement)) throw new Error('Exit nativeElement is not an HTMLElement');
  return root;
}

function queryControl(root: HTMLElement, selector: string): HTMLInputElement | HTMLTextAreaElement {
  const element = root.querySelector(selector);
  if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
    throw new Error(`Control not found: ${selector}`);
  }
  return element;
}

function queryButton(root: HTMLElement, selector: string): HTMLButtonElement {
  const element = root.querySelector(selector);
  if (!(element instanceof HTMLButtonElement)) throw new Error(`Button not found: ${selector}`);
  return element;
}

function fillContactForm(root: HTMLElement, values: { readonly name: string; readonly email: string; readonly message: string }): void {
  for (const [selector, value] of [['#name', values.name], ['#email', values.email], ['#message', values.message]] as const) {
    const field = queryControl(root, selector);
    field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

function setViewportWidth(width: number): void {
  Object.defineProperty(window, 'innerWidth', { value: width, writable: true, configurable: true });
  window.dispatchEvent(new Event('resize'));
}

describe('Exit layout and pagination parity', () => {
  let fixture: ComponentFixture<Exit>;
  let bookService: BookService;
  let nav: BookNavigationDirective;
  let httpMock: HttpTestingController;
  let originalInnerWidth: number;

  beforeEach(async () => {
    originalInnerWidth = window.innerWidth;
    const mockRepo = createMockContentReadRepository({
      loadSections: vi.fn(async () => [...CONTACT_LAYOUT_FIXTURES.fullExitSections])
    });
    await TestBed.configureTestingModule({
      imports: [Exit],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: CONTENT_READ_REPOSITORY, useValue: mockRepo },
        { provide: ANTI_SPAM_TOKEN_PORT, useValue: CONTACT_HTTP_FIXTURES.antiSpam.createMockPort() }
      ]
    }).compileComponents();

    bookService = TestBed.inject(BookService);
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Exit);
    nav = fixture.debugElement.injector.get(BookNavigationDirective);
    Object.defineProperty(requireHost(fixture), 'scrollTo', { value: vi.fn(), configurable: true });
    fixture.componentRef.setInput('lang', CONTACT_LAYOUT_FIXTURES.exitLang);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
    setViewportWidth(originalInnerWidth);
    fixture.destroy();
    httpMock.verify();
    document.head.querySelector('script[src*="recaptcha"]')?.remove();
    document.cookie = 'ibid-lang=; path=/; max-age=0';
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('should update blank-page spread parity and BookService page counts for validation errors, global submission errors, and confirmation banners', async () => {
    const root = requireHost(fixture);
    const slug = bookService.activeChapterSlug();
    let currentScrollWidth: number = CONTACT_LAYOUT_FIXTURES.balancedScrollWidth;
    Object.defineProperty(root, 'clientWidth', { value: CONTACT_LAYOUT_FIXTURES.desktopViewport.width, configurable: true });
    Object.defineProperty(root, 'clientHeight', { value: CONTACT_LAYOUT_FIXTURES.desktopViewport.height, configurable: true });
    Object.defineProperty(root, 'scrollWidth', { get: () => currentScrollWidth, configurable: true });

    vi.useFakeTimers();
    setViewportWidth(CONTACT_LAYOUT_FIXTURES.desktopViewport.width);
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(350);
    fixture.detectChanges();

    expect(nav.needsBlankPage()).toBe(false);
    expect(root.querySelector('.page-blank')).toBeNull();
    expect(bookService.getChapterPages(slug)).toBe(2);

    currentScrollWidth = CONTACT_LAYOUT_FIXTURES.unbalancedScrollWidth;
    const submitButton = queryButton(root, '.contact-form button[type="submit"]');
    submitButton.click();
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(20);
    fixture.detectChanges();

    expect(nav.needsBlankPage()).toBe(true);
    expect(root.querySelector('.page-blank')).not.toBeNull();

    currentScrollWidth = CONTACT_LAYOUT_FIXTURES.paddedScrollWidth;
    await vi.advanceTimersByTimeAsync(60);
    fixture.detectChanges();

    expect(nav.needsBlankPage()).toBe(true);
    expect(root.querySelector('.page-blank')).not.toBeNull();
    expect(bookService.getChapterPages(slug)).toBe(4);

    fillContactForm(root, CONTACT_LAYOUT_FIXTURES.validSubmission);
    currentScrollWidth = CONTACT_LAYOUT_FIXTURES.unbalancedScrollWidth;
    submitButton.click();
    await CONTACT_HTTP_FIXTURES.flushMicrotasks();
    httpMock.expectOne(CONTACT_HTTP_FIXTURES.contactEndpoint).error(CONTACT_HTTP_FIXTURES.createNetworkErrorEvent());
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(20);
    fixture.detectChanges();

    expect(root.querySelector('.form-error-global[role="alert"]')).not.toBeNull();
    expect(nav.needsBlankPage()).toBe(false);
    expect(root.querySelector('.page-blank')).toBeNull();

    currentScrollWidth = CONTACT_LAYOUT_FIXTURES.balancedScrollWidth;
    await vi.advanceTimersByTimeAsync(60);
    fixture.detectChanges();

    expect(nav.needsBlankPage()).toBe(false);
    expect(root.querySelector('.page-blank')).toBeNull();
    expect(bookService.getChapterPages(slug)).toBe(2);

    currentScrollWidth = CONTACT_LAYOUT_FIXTURES.unbalancedScrollWidth;
    queryButton(root, '.form-error-global__retry').click();
    await CONTACT_HTTP_FIXTURES.flushMicrotasks();
    httpMock.expectOne(CONTACT_HTTP_FIXTURES.contactEndpoint).flush(CONTACT_HTTP_FIXTURES.successBody);
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(20);
    fixture.detectChanges();

    expect(root.querySelector('.form-confirmation')).not.toBeNull();
    expect(nav.needsBlankPage()).toBe(true);
    expect(root.querySelector('.page-blank')).not.toBeNull();

    currentScrollWidth = CONTACT_LAYOUT_FIXTURES.paddedScrollWidth;
    await vi.advanceTimersByTimeAsync(60);
    fixture.detectChanges();

    expect(nav.needsBlankPage()).toBe(true);
    expect(root.querySelector('.page-blank')).not.toBeNull();
    expect(bookService.getChapterPages(slug)).toBe(4);
  });

  it('should scroll instantly to the post-submission confirmation banner without auto-scrolling to #back-cover', async () => {
    const root = requireHost(fixture);
    setViewportWidth(CONTACT_LAYOUT_FIXTURES.desktopViewport.width);
    fixture.detectChanges();

    let currentScrollLeft = 0;
    Object.defineProperty(root, 'clientWidth', { value: CONTACT_LAYOUT_FIXTURES.desktopViewport.width, configurable: true });
    Object.defineProperty(root, 'scrollWidth', { value: CONTACT_LAYOUT_FIXTURES.paddedScrollWidth, configurable: true });
    Object.defineProperty(root, 'scrollLeft', {
      get: () => currentScrollLeft,
      set: (value: number) => {
        currentScrollLeft = value;
      },
      configurable: true
    });
    const scrollToSpy = vi.fn((options?: ScrollToOptions) => {
      if (typeof options?.left === 'number') currentScrollLeft = options.left;
    });
    Object.defineProperty(root, 'scrollTo', { value: scrollToSpy, configurable: true });
    vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockImplementation(function (this: HTMLElement) {
      if (this.classList.contains('form-confirmation')) return CONTACT_LAYOUT_FIXTURES.desktopViewport.width;
      if (this.id === 'back-cover') return CONTACT_LAYOUT_FIXTURES.paddedScrollWidth;
      return 0;
    });

    fillContactForm(root, CONTACT_LAYOUT_FIXTURES.validSubmission);

    const submitButton = queryButton(root, '.contact-form button[type="submit"]');
    scrollToSpy.mockClear();
    submitButton.click();
    await CONTACT_HTTP_FIXTURES.flushMicrotasks();
    httpMock.expectOne(CONTACT_HTTP_FIXTURES.contactEndpoint).flush(CONTACT_HTTP_FIXTURES.successBody);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(scrollToSpy).toHaveBeenCalledWith({ left: CONTACT_LAYOUT_FIXTURES.desktopViewport.width, behavior: 'instant' });
    expect(scrollToSpy).not.toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }));
    expect(scrollToSpy).not.toHaveBeenCalledWith(expect.objectContaining({ left: CONTACT_LAYOUT_FIXTURES.paddedScrollWidth }));
    expect(bookService.currentChapterPage()).toBe(3);
  });
});
