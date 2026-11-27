import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ContactFacade } from '../../../application/facades/contact.facade';
import { CONTACT_I18N } from '../../../domain/constants/contact-i18n';
import { BYPASS_GLOBAL_ERROR, errorInterceptor } from '../../../infrastructure/interceptors/error.interceptor';
import { BookService } from '../../../infrastructure/services/book.service';
import { UiErrorService } from '../../../infrastructure/services/ui-error.service';
import { ANTI_SPAM_TOKEN_PORT } from '../../../infrastructure/tokens/contact.tokens';
import { CONTENT_READ_REPOSITORY } from '../../../infrastructure/tokens/content-repository.token';
import { CONTACT_HTTP_FIXTURES } from '../../../../mocks/contact-form.mock';
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
const queryButton = (root: HTMLElement, selector: string): HTMLButtonElement =>
  queryEl(root, selector, HTMLButtonElement);

function dispatchFieldInput(field: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  field.value = value;
  field.dispatchEvent(new Event('input', { bubbles: true }));
}

function dispatchKey(target: EventTarget, key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
}

function fillValidForm(root: HTMLElement): void {
  dispatchFieldInput(queryInput(root, '#name'), CONTACT_FORM_FIXTURES.validName);
  dispatchFieldInput(queryInput(root, '#email'), CONTACT_FORM_FIXTURES.validEmail);
  dispatchFieldInput(queryTextArea(root, '#message'), CONTACT_FORM_FIXTURES.validMessage);
}

describe('Exit submission requests', () => {
  let fixture: ComponentFixture<Exit>;
  let facade: ContactFacade;
  let bookService: BookService;
  let httpMock: HttpTestingController;
  let uiError: UiErrorService;

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
    httpMock = TestBed.inject(HttpTestingController);
    uiError = TestBed.inject(UiErrorService);
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

  it('should render a native submit button that activates with Enter or Space, sets disabled and aria-busy="true", and shows a localized sending label while sending', async () => {
    const root = requireHost(fixture);
    expect(root.querySelector('.contact-form [role="button"]')).toBeNull();
    const submitButton = queryButton(root, '.contact-form button[type="submit"]');
    expect(submitButton.closest('form')).not.toBeNull();
    expect(submitButton.disabled).toBe(false);
    expect(submitButton.getAttribute('aria-busy')).toBe('false');
    expect(submitButton.textContent?.trim()).toBe(CONTACT_I18N.pt.submit);

    const triggerFlipSpy = vi.spyOn(bookService, 'triggerFlip');
    expect(dispatchKey(submitButton, ' ').defaultPrevented).toBe(false);
    expect(dispatchKey(submitButton, 'Enter').defaultPrevented).toBe(false);
    expect(triggerFlipSpy).not.toHaveBeenCalled();

    fillValidForm(root);
    submitButton.click();
    fixture.detectChanges();
    await CONTACT_HTTP_FIXTURES.flushMicrotasks();
    const req = httpMock.expectOne(CONTACT_HTTP_FIXTURES.contactEndpoint);
    expect(req.request.method).toBe('POST');
    expect(req.request.context.get(BYPASS_GLOBAL_ERROR)).toBe(true);
    expect(submitButton.disabled).toBe(true);
    expect(submitButton.getAttribute('aria-busy')).toBe('true');
    expect(submitButton.textContent?.trim()).toBe(CONTACT_I18N.pt.submitting);

    req.flush(CONTACT_HTTP_FIXTURES.successBody);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(submitButton.disabled).toBe(false);
    expect(submitButton.getAttribute('aria-busy')).toBe('false');
    expect(submitButton.textContent?.trim()).toBe(CONTACT_I18N.pt.submit);
    expect(facade.submitStatus()).toBe('success');
  });

  it('should trigger only one HTTP request when clicking submit or pressing Enter multiple times while sending', async () => {
    const root = requireHost(fixture);
    const submitButton = queryButton(root, '.contact-form button[type="submit"]');
    const form = root.querySelector('.contact-form');
    const nameInput = queryInput(root, '#name');
    fillValidForm(root);
    submitButton.click();
    fixture.detectChanges();
    await CONTACT_HTTP_FIXTURES.flushMicrotasks();
    const req = httpMock.expectOne(CONTACT_HTTP_FIXTURES.contactEndpoint);
    expect(submitButton.disabled).toBe(true);
    submitButton.click();
    dispatchKey(nameInput, 'Enter');
    dispatchKey(submitButton, 'Enter');
    form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    httpMock.expectNone(CONTACT_HTTP_FIXTURES.contactEndpoint);
    req.flush(CONTACT_HTTP_FIXTURES.successBody);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(facade.submitStatus()).toBe('success');
  });

  it('should cancel a pending submission and clear busy state on component teardown', async () => {
    const root = requireHost(fixture);
    const submitButton = queryButton(root, '.contact-form button[type="submit"]');
    fillValidForm(root);
    submitButton.click();
    fixture.detectChanges();
    await CONTACT_HTTP_FIXTURES.flushMicrotasks();
    const req = httpMock.expectOne(CONTACT_HTTP_FIXTURES.contactEndpoint);
    expect(facade.isSubmitting()).toBe(true);
    fixture.destroy();
    expect(req.cancelled).toBe(true);
    expect(facade.isSubmitting()).toBe(false);
    expect(facade.submitStatus()).toBe('idle');
    expect(uiError.currentError()).toBeNull();
  });
});
