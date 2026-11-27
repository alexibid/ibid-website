import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ContactFacade } from '../../../application/facades/contact.facade';
import { StateService } from '../../../application/state/state.service';
import { PageType } from '../../../domain/models/page-type.enum';
import { errorInterceptor } from '../../../infrastructure/interceptors/error.interceptor';
import { BookService } from '../../../infrastructure/services/book.service';
import { ANTI_SPAM_TOKEN_PORT } from '../../../infrastructure/tokens/contact.tokens';
import { CONTENT_READ_REPOSITORY } from '../../../infrastructure/tokens/content-repository.token';
import { BOOK_NAVIGATION_FIXTURES } from '../../../../mocks/book-navigation.mock';
import { CONTACT_HTTP_FIXTURES } from '../../../../mocks/contact-form.mock';
import { CONTACT_JOURNEY_FIXTURES } from '../../../../mocks/contact-journey.mock';
import { CONTACT_FORM_FIXTURES, createMockContentReadRepository } from '../../../../mocks/static-html.mock';
import { Exit } from './exit';

function requireHost(fixture: ComponentFixture<Exit>): HTMLElement {
  const root: unknown = fixture.nativeElement;
  if (!(root instanceof HTMLElement)) throw new Error('Exit nativeElement is not an HTMLElement');
  return root;
}

function queryEl<T extends Element>(root: HTMLElement, selector: string, ctor: abstract new () => T): T {
  const element = root.querySelector(selector);
  if (!(element instanceof ctor)) throw new Error(`Element not found: ${selector}`);
  return element;
}

const queryInput = (root: HTMLElement, selector: string): HTMLInputElement =>
  queryEl(root, selector, HTMLInputElement);
const queryTextArea = (root: HTMLElement, selector: string): HTMLTextAreaElement =>
  queryEl(root, selector, HTMLTextAreaElement);

function dispatchKey(target: EventTarget, key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
}

function dispatchFieldInput(field: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  field.value = value;
  field.dispatchEvent(new Event('input', { bubbles: true }));
}

function configureScrollableHost(root: HTMLElement, initialScrollLeft: number): ReturnType<typeof vi.fn> {
  let scrollLeftValue = initialScrollLeft;
  const scrollBySpy = vi.fn((options?: ScrollToOptions) => {
    scrollLeftValue += options?.left ?? 0;
  });
  Object.defineProperty(root, 'clientWidth', { value: CONTACT_FORM_FIXTURES.viewportWidth, configurable: true });
  Object.defineProperty(root, 'scrollWidth', { value: CONTACT_FORM_FIXTURES.scrollWidth, configurable: true });
  Object.defineProperty(root, 'scrollBy', { value: scrollBySpy, configurable: true });
  Object.defineProperty(root, 'scrollLeft', {
    get: () => scrollLeftValue,
    set: (value: number) => {
      scrollLeftValue = value;
    },
    configurable: true
  });
  return scrollBySpy;
}

describe('Exit keyboard navigation guard', () => {
  let fixture: ComponentFixture<Exit>;
  let facade: ContactFacade;
  let bookService: BookService;
  let stateService: StateService;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Exit],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: CONTENT_READ_REPOSITORY, useValue: createMockContentReadRepository() },
        { provide: ANTI_SPAM_TOKEN_PORT, useValue: CONTACT_HTTP_FIXTURES.antiSpam.createMockPort() }
      ]
    }).compileComponents();

    facade = TestBed.inject(ContactFacade);
    bookService = TestBed.inject(BookService);
    stateService = TestBed.inject(StateService);
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Exit);
    Object.defineProperty(requireHost(fixture), 'scrollTo', { value: vi.fn(), configurable: true });
    fixture.componentRef.setInput('lang', CONTACT_FORM_FIXTURES.exitLang);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    httpMock.verify();
    document.head.querySelector('script[src*="recaptcha"]')?.remove();
    document.cookie = 'ibid-lang=; path=/; max-age=0';
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('should allow editing and never trigger a book page turn when pressing Space, Arrow keys, Backspace, or Enter while focused inside #name, #email, or #message', () => {
    const root = requireHost(fixture);
    const midScrollLeft = CONTACT_FORM_FIXTURES.viewportWidth;
    const endScrollLeft = CONTACT_FORM_FIXTURES.scrollWidth - CONTACT_FORM_FIXTURES.viewportWidth;
    const scrollBySpy = configureScrollableHost(root, midScrollLeft);
    bookService.activePageType.set(PageType.Exit);
    bookService.currentChapterPage.set(1);
    stateService.prevLink.set('/' + BOOK_NAVIGATION_FIXTURES.routes[2].slug);
    stateService.nextLink.set('/' + BOOK_NAVIGATION_FIXTURES.routes[3].slug);
    const triggerFlipSpy = vi.spyOn(bookService, 'triggerFlip');
    const navigateSpy = vi.spyOn(stateService, 'navigateWithFlip');

    const fieldCases: readonly [HTMLInputElement | HTMLTextAreaElement, string][] = [
      [queryInput(root, '#name'), CONTACT_JOURNEY_FIXTURES.keyboard.name],
      [queryInput(root, '#email'), CONTACT_JOURNEY_FIXTURES.keyboard.email],
      [queryTextArea(root, '#message'), CONTACT_JOURNEY_FIXTURES.keyboard.message]
    ];

    for (const [field, editedValue] of fieldCases) {
      field.focus();
      expect(document.activeElement).toBe(field);

      for (const scrollLeft of [midScrollLeft, 0, endScrollLeft]) {
        root.scrollLeft = scrollLeft;
        for (const key of [' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Backspace', 'Enter']) {
          expect(dispatchKey(field, key).defaultPrevented).toBe(false);
        }
        expect(root.scrollLeft).toBe(scrollLeft);
      }

      dispatchFieldInput(field, editedValue);
      fixture.detectChanges();
      expect(field.value).toBe(editedValue);
      expect(document.activeElement).toBe(field);
    }

    expect(facade.name()).toBe(CONTACT_JOURNEY_FIXTURES.keyboard.name);
    expect(facade.email()).toBe(CONTACT_JOURNEY_FIXTURES.keyboard.email);
    expect(facade.message()).toBe(CONTACT_JOURNEY_FIXTURES.keyboard.message);
    expect(triggerFlipSpy).not.toHaveBeenCalled();
    expect(navigateSpy).not.toHaveBeenCalled();
    expect(scrollBySpy).not.toHaveBeenCalled();
  });

  it('should turn the page when pressing Space outside editable fields while Space inside form fields never navigates', () => {
    const root = requireHost(fixture);
    const midScrollLeft = CONTACT_FORM_FIXTURES.viewportWidth;
    const scrollBySpy = configureScrollableHost(root, midScrollLeft);
    bookService.activePageType.set(PageType.Exit);
    stateService.nextLink.set('/' + BOOK_NAVIGATION_FIXTURES.routes[3].slug);
    const triggerFlipSpy = vi.spyOn(bookService, 'triggerFlip');
    const navigateSpy = vi.spyOn(stateService, 'navigateWithFlip');
    const nameInput = queryInput(root, '#name');

    nameInput.focus();
    expect(document.activeElement).toBe(nameInput);
    expect(dispatchKey(nameInput, ' ').defaultPrevented).toBe(false);
    expect(triggerFlipSpy).not.toHaveBeenCalled();
    expect(navigateSpy).not.toHaveBeenCalled();
    expect(scrollBySpy).not.toHaveBeenCalled();

    nameInput.blur();
    document.body.focus();
    const spaceTurn = dispatchKey(document.body, ' ');
    expect(spaceTurn.defaultPrevented).toBe(true);
    expect(triggerFlipSpy).toHaveBeenCalledWith(1);
    expect(scrollBySpy).toHaveBeenCalledWith({
      left: CONTACT_FORM_FIXTURES.viewportWidth,
      behavior: 'instant'
    });
    expect(root.scrollLeft).toBe(CONTACT_FORM_FIXTURES.viewportWidth * 2);
  });
});
