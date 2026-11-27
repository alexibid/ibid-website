import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ContactFacade } from '../../../application/facades/contact.facade';
import { CONTACT_I18N } from '../../../domain/constants/contact-i18n';
import { errorInterceptor } from '../../../infrastructure/interceptors/error.interceptor';
import { ANTI_SPAM_TOKEN_PORT } from '../../../infrastructure/tokens/contact.tokens';
import { CONTENT_READ_REPOSITORY } from '../../../infrastructure/tokens/content-repository.token';
import { CONTACT_HTTP_FIXTURES } from '../../../../mocks/contact-form.mock';
import {
  CONTACT_FORM_FIXTURES,
  createMockContentReadRepository,
  type ContentReadRepositoryMock
} from '../../../../mocks/static-html.mock';
import { Exit } from './exit';

function requireHost(fixture: ComponentFixture<Exit>): HTMLElement {
  const root: unknown = fixture.nativeElement;
  if (!(root instanceof HTMLElement)) {
    throw new Error('Exit nativeElement is not an HTMLElement');
  }
  return root;
}

function queryEl<T extends Element>(
  root: HTMLElement,
  selector: string,
  ctor: abstract new () => T
): T {
  const element = root.querySelector(selector);
  if (!(element instanceof ctor)) {
    throw new Error(`Element not found: ${selector}`);
  }
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

function fillValidForm(root: HTMLElement): void {
  dispatchFieldInput(queryInput(root, '#name'), CONTACT_FORM_FIXTURES.validName);
  dispatchFieldInput(queryInput(root, '#email'), CONTACT_FORM_FIXTURES.validEmail);
  dispatchFieldInput(queryTextArea(root, '#message'), CONTACT_FORM_FIXTURES.validMessage);
}

describe('Exit submission feedback and recovery', () => {
  let fixture: ComponentFixture<Exit>;
  let facade: ContactFacade;
  let httpMock: HttpTestingController;
  let mockRepo: ContentReadRepositoryMock;

  beforeEach(async () => {
    mockRepo = createMockContentReadRepository();
    await TestBed.configureTestingModule({
      imports: [Exit],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: CONTENT_READ_REPOSITORY, useValue: mockRepo },
        { provide: ANTI_SPAM_TOKEN_PORT, useValue: CONTACT_HTTP_FIXTURES.antiSpam.createMockPort() }
      ]
    }).compileComponents();

    facade = TestBed.inject(ContactFacade);
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

  it('should announce confirmation in an aria-live="polite" region, focus the inline confirmation banner, keep back-cover navigation manual, and reset to #name on "Send another message"', async () => {
    const root = requireHost(fixture);
    const scrollToSpy = vi.fn();
    Object.defineProperty(root, 'scrollTo', { value: scrollToSpy, configurable: true });

    const liveRegion = root.querySelector('[aria-live="polite"]');
    expect(liveRegion).not.toBeNull();
    expect(liveRegion?.getAttribute('aria-atomic')).toBe('true');
    expect(liveRegion?.textContent?.trim()).toBe('');
    expect(root.querySelector('.form-confirmation')).toBeNull();

    fillValidForm(root);
    await fixture.whenStable();
    queryButton(root, '.contact-form button[type="submit"]').click();
    await CONTACT_HTTP_FIXTURES.flushMicrotasks();
    httpMock.expectOne(CONTACT_HTTP_FIXTURES.contactEndpoint).flush(CONTACT_HTTP_FIXTURES.successBody);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(liveRegion?.textContent?.trim()).toBe(
      `${CONTACT_I18N.pt['success-title']}. ${CONTACT_I18N.pt['success-message']}`
    );

    const banner = root.querySelector('.form-confirmation');
    expect(banner).not.toBeNull();
    expect(banner?.getAttribute('tabindex')).toBe('-1');
    expect(banner?.querySelector('.form-confirmation__title')?.textContent?.trim()).toBe(
      CONTACT_I18N.pt['success-title']
    );
    expect(banner?.querySelector('.form-confirmation__message')?.textContent?.trim()).toBe(
      CONTACT_I18N.pt['success-message']
    );
    expect(document.activeElement).toBe(banner);
    expect(scrollToSpy).not.toHaveBeenCalled();
    expect(queryInput(root, '#name').value).toBe('');
    expect(queryInput(root, '#email').value).toBe('');
    expect(queryTextArea(root, '#message').value).toBe('');

    const sendAnotherButton = queryButton(root, '.form-confirmation__action');
    expect(sendAnotherButton.textContent?.trim()).toBe(CONTACT_I18N.pt['send-another']);
    sendAnotherButton.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(root.querySelector('.form-confirmation')).toBeNull();
    expect(liveRegion?.textContent?.trim()).toBe('');
    expect(facade.submitStatus()).toBe('idle');
    expect(document.activeElement).toBe(queryInput(root, '#name'));
  });

  it('should present a role="alert" error banner on failed send, preserve entered field values, clear the alert on edit, and allow immediate retry without reloading', async () => {
    const root = requireHost(fixture);
    const nameInput = queryInput(root, '#name');
    const emailInput = queryInput(root, '#email');
    const messageInput = queryTextArea(root, '#message');
    const submitButton = queryButton(root, '.contact-form button[type="submit"]');

    fillValidForm(root);
    submitButton.click();
    await CONTACT_HTTP_FIXTURES.flushMicrotasks();
    httpMock
      .expectOne(CONTACT_HTTP_FIXTURES.contactEndpoint)
      .flush(null, CONTACT_HTTP_FIXTURES.statusResponses.server);
    await fixture.whenStable();
    fixture.detectChanges();

    const alert = root.querySelector('.form-error-global[role="alert"]');
    expect(alert).not.toBeNull();
    expect(alert?.querySelector('.form-error-global__message')?.textContent?.trim()).toBe(
      CONTACT_I18N.pt['submission-errors'].server
    );
    expect(nameInput.value).toBe(CONTACT_FORM_FIXTURES.validName);
    expect(emailInput.value).toBe(CONTACT_FORM_FIXTURES.validEmail);
    expect(messageInput.value).toBe(CONTACT_FORM_FIXTURES.validMessage);

    const retryButton = queryButton(root, '.form-error-global__retry');
    expect(retryButton.textContent?.trim()).toBe(CONTACT_I18N.pt.retry);
    retryButton.click();
    fixture.detectChanges();
    await CONTACT_HTTP_FIXTURES.flushMicrotasks();

    const retryReq = httpMock.expectOne(CONTACT_HTTP_FIXTURES.contactEndpoint);
    expect(retryReq.request.method).toBe('POST');
    retryReq.flush(null, CONTACT_HTTP_FIXTURES.statusResponses.rateLimit);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(
      root.querySelector('.form-error-global[role="alert"] .form-error-global__message')?.textContent?.trim()
    ).toBe(CONTACT_I18N.pt['submission-errors'].rateLimit);

    dispatchFieldInput(nameInput, CONTACT_FORM_FIXTURES.editedName);
    fixture.detectChanges();

    expect(root.querySelector('.form-error-global')).toBeNull();
    expect(nameInput.value).toBe(CONTACT_FORM_FIXTURES.editedName);
    expect(emailInput.value).toBe(CONTACT_FORM_FIXTURES.validEmail);
    expect(messageInput.value).toBe(CONTACT_FORM_FIXTURES.validMessage);

    submitButton.click();
    await CONTACT_HTTP_FIXTURES.flushMicrotasks();
    const recoveryReq = httpMock.expectOne(CONTACT_HTTP_FIXTURES.contactEndpoint);
    expect(recoveryReq.request.method).toBe('POST');
    recoveryReq.flush(CONTACT_HTTP_FIXTURES.successBody);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(root.querySelector('.form-error-global')).toBeNull();
    expect(root.querySelector('.form-confirmation')).not.toBeNull();
  });
});
