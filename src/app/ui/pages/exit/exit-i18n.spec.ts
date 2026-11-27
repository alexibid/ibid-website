import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CONTACT_I18N } from '../../../domain/constants/contact-i18n';
import type { CmsPage } from '../../../domain/models/cms.interface';
import { ContactFacade } from '../../../application/facades/contact.facade';
import { errorInterceptor } from '../../../infrastructure/interceptors/error.interceptor';
import { ANTI_SPAM_TOKEN_PORT } from '../../../infrastructure/tokens/contact.tokens';
import { CONTENT_READ_REPOSITORY } from '../../../infrastructure/tokens/content-repository.token';
import {
  CONTACT_HTTP_FIXTURES,
  CONTACT_I18N_FIXTURES,
  CONTACT_VALIDATION_FIXTURES
} from '../../../../mocks/contact-form.mock';
import {
  createDeferred,
  createMockContentReadRepository
} from '../../../../mocks/static-html.mock';
import { Exit } from './exit';

function requireHost(fixture: ComponentFixture<Exit>): HTMLElement {
  const root = fixture.nativeElement;
  if (!(root instanceof HTMLElement)) {
    throw new Error('Exit nativeElement is not an HTMLElement');
  }
  return root;
}

function queryInput(root: HTMLElement, selector: string): HTMLInputElement {
  const element = root.querySelector(selector);
  if (!(element instanceof HTMLInputElement)) {
    throw new Error(`Input not found: ${selector}`);
  }
  return element;
}

function queryTextArea(root: HTMLElement, selector: string): HTMLTextAreaElement {
  const element = root.querySelector(selector);
  if (!(element instanceof HTMLTextAreaElement)) {
    throw new Error(`Textarea not found: ${selector}`);
  }
  return element;
}

function queryButton(root: HTMLElement, selector: string): HTMLButtonElement {
  const element = root.querySelector(selector);
  if (!(element instanceof HTMLButtonElement)) {
    throw new Error(`Button not found: ${selector}`);
  }
  return element;
}

function textOf(root: HTMLElement, selector: string): string {
  return root.querySelector(selector)?.textContent?.trim() ?? '';
}

function dispatchInput(field: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  field.value = value;
  field.dispatchEvent(new Event('input', { bubbles: true }));
}

function fillValues(
  root: HTMLElement,
  values: { readonly name: string; readonly email: string; readonly message: string }
): void {
  dispatchInput(queryInput(root, '#name'), values.name);
  dispatchInput(queryInput(root, '#email'), values.email);
  dispatchInput(queryTextArea(root, '#message'), values.message);
}

describe('Exit localization', () => {
  let fixture: ComponentFixture<Exit>;
  let facade: ContactFacade;
  let httpMock: HttpTestingController;
  let sectionsGate: ReturnType<typeof createDeferred<void>>;

  beforeEach(async () => {
    sectionsGate = createDeferred<void>();
    const defaultRepo = createMockContentReadRepository();
    const mockRepo = createMockContentReadRepository({
      loadSections: vi.fn(async (type, lang): Promise<CmsPage[]> => {
        await sectionsGate.promise;
        return defaultRepo.loadSections(type, lang);
      })
    });

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
    fixture.componentRef.setInput('lang', CONTACT_I18N_FIXTURES.languages[0]);
    fixture.detectChanges();
  });

  afterEach(() => {
    sectionsGate.resolve();
    fixture.destroy();
    httpMock.verify();
    document.head.querySelector('script[src*="recaptcha"]')?.remove();
    document.cookie = 'ibid-lang=; path=/; max-age=0';
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('should resolve exit loading state, labels, placeholders, busy button, confirmation banner, failure message, retry prompt, and privacy notice from translations', async () => {
    const root = requireHost(fixture);
    const pt = CONTACT_I18N.pt;

    expect(textOf(root, '.loading-state p')).toBe(pt.loading);

    sectionsGate.resolve();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(textOf(root, 'label[for="name"]')).toBe(pt.name);
    expect(queryInput(root, '#name').placeholder).toBe(pt['name-placeholder']);
    expect(textOf(root, 'label[for="email"]')).toBe(pt.email);
    expect(queryInput(root, '#email').placeholder).toBe(pt['email-placeholder']);
    expect(textOf(root, 'label[for="message"]')).toBe(pt.message);
    expect(queryTextArea(root, '#message').placeholder).toBe(pt['message-placeholder']);
    expect(textOf(root, '.submit-btn')).toBe(pt.submit);
    expect(textOf(root, '.contact-privacy')).toBe(pt['privacy-notice']);
    expect(queryButton(root, '.submit-btn').nextElementSibling).toBe(root.querySelector('.contact-privacy'));

    fillValues(root, CONTACT_HTTP_FIXTURES.validSubmission);

    const submitButton = queryButton(root, '.contact-form button[type="submit"]');
    submitButton.click();
    fixture.detectChanges();
    expect(textOf(root, '.submit-btn')).toBe(pt.submitting);

    await CONTACT_HTTP_FIXTURES.flushMicrotasks();
    httpMock.expectOne(CONTACT_HTTP_FIXTURES.contactEndpoint).error(CONTACT_HTTP_FIXTURES.createNetworkErrorEvent());
    await fixture.whenStable();
    fixture.detectChanges();

    expect(textOf(root, '.form-error-global__message')).toBe(pt['submission-errors'].network);
    expect(textOf(root, '.form-error-global__retry')).toBe(pt.retry);

    submitButton.click();
    await CONTACT_HTTP_FIXTURES.flushMicrotasks();
    httpMock.expectOne(CONTACT_HTTP_FIXTURES.contactEndpoint).flush(CONTACT_HTTP_FIXTURES.successBody);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(textOf(root, '.form-confirmation__title')).toBe(pt['success-title']);
    expect(textOf(root, '.form-confirmation__message')).toBe(pt['success-message']);
    expect(textOf(root, '.form-confirmation__action')).toBe(pt['send-another']);
  });

  it('should display distinct localized inline failure messages for offline, network, 400, 403, 429, and 5xx responses while keeping typed input intact', async () => {
    const root = requireHost(fixture);
    const pt = CONTACT_I18N.pt;
    sectionsGate.resolve();
    await fixture.whenStable();
    fixture.detectChanges();

    fillValues(root, CONTACT_HTTP_FIXTURES.validSubmission);
    const submitButton = queryButton(root, '.contact-form button[type="submit"]');
    const renderedMessages: string[] = [];

    const onLineSpy = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    submitButton.click();
    await fixture.whenStable();
    fixture.detectChanges();
    httpMock.expectNone(CONTACT_HTTP_FIXTURES.contactEndpoint);
    const offlineMessage = textOf(root, '.form-error-global__message');
    expect(offlineMessage).toBe(pt['submission-errors'].offline);
    renderedMessages.push(offlineMessage);

    onLineSpy.mockReturnValue(true);
    submitButton.click();
    await CONTACT_HTTP_FIXTURES.flushMicrotasks();
    httpMock.expectOne(CONTACT_HTTP_FIXTURES.contactEndpoint).error(CONTACT_HTTP_FIXTURES.createNetworkErrorEvent());
    await fixture.whenStable();
    fixture.detectChanges();
    const networkMessage = textOf(root, '.form-error-global__message');
    expect(networkMessage).toBe(pt['submission-errors'].network);
    renderedMessages.push(networkMessage);

    const { statusResponses } = CONTACT_HTTP_FIXTURES;
    const statusCases = [
      ['validation', statusResponses.validation],
      ['verification', statusResponses.verification],
      ['rateLimit', statusResponses.rateLimit],
      ['server', statusResponses.server]
    ] as const;

    for (const [code, responseInit] of statusCases) {
      submitButton.click();
      await CONTACT_HTTP_FIXTURES.flushMicrotasks();
      httpMock.expectOne(CONTACT_HTTP_FIXTURES.contactEndpoint).flush(null, responseInit);
      await fixture.whenStable();
      fixture.detectChanges();

      const message = textOf(root, '.form-error-global__message');
      expect(message).toBe(pt['submission-errors'][code]);
      expect(queryInput(root, '#name').value).toBe(CONTACT_HTTP_FIXTURES.validSubmission.name);
      expect(queryInput(root, '#email').value).toBe(CONTACT_HTTP_FIXTURES.validSubmission.email);
      expect(queryTextArea(root, '#message').value).toBe(CONTACT_HTTP_FIXTURES.validSubmission.message);
      renderedMessages.push(message);
    }

    expect(new Set(renderedMessages).size).toBe(6);
  });

  it('should immediately update displayed labels, privacy notice near the submit button, active validation errors, and status messages when switching site language across pt, en, es, fr, and de without English or Portuguese fallbacks', async () => {
    const root = requireHost(fixture);
    sectionsGate.resolve();
    await fixture.whenStable();
    fixture.detectChanges();

    const submitButton = queryButton(root, '.contact-form button[type="submit"]');
    fillValues(root, CONTACT_VALIDATION_FIXTURES.formCases.allInvalid);
    submitButton.click();
    await fixture.whenStable();
    fixture.detectChanges();
    httpMock.expectNone(CONTACT_HTTP_FIXTURES.contactEndpoint);

    for (const lang of CONTACT_I18N_FIXTURES.languages) {
      facade.setLanguage(lang);
      fixture.detectChanges();
      const expected = CONTACT_I18N[lang];

      expect(textOf(root, 'label[for="name"]')).toBe(expected.name);
      expect(textOf(root, 'label[for="email"]')).toBe(expected.email);
      expect(textOf(root, 'label[for="message"]')).toBe(expected.message);
      expect(queryInput(root, '#name').placeholder).toBe(expected['name-placeholder']);
      expect(queryInput(root, '#email').placeholder).toBe(expected['email-placeholder']);
      expect(queryTextArea(root, '#message').placeholder).toBe(expected['message-placeholder']);
      expect(textOf(root, '.submit-btn')).toBe(expected.submit);
      expect(textOf(root, '.contact-privacy')).toBe(expected['privacy-notice']);
      expect(submitButton.nextElementSibling).toBe(root.querySelector('.contact-privacy'));
      expect(textOf(root, `#${CONTACT_VALIDATION_FIXTURES.errorIds.name}`)).toBe(expected.errors.name.required);
      expect(textOf(root, `#${CONTACT_VALIDATION_FIXTURES.errorIds.email}`)).toBe(expected.errors.email.tooShort);
      expect(textOf(root, `#${CONTACT_VALIDATION_FIXTURES.errorIds.message}`)).toBe(expected.errors.message.tooShort);

      if (CONTACT_I18N_FIXTURES.nonFallbackLanguages.some((code) => code === lang)) {
        expect(textOf(root, '.submit-btn')).not.toBe(CONTACT_I18N.en.submit);
        expect(textOf(root, '.submit-btn')).not.toBe(CONTACT_I18N.pt.submit);
        expect(textOf(root, '.contact-privacy')).not.toBe(CONTACT_I18N.en['privacy-notice']);
        expect(textOf(root, '.contact-privacy')).not.toBe(CONTACT_I18N.pt['privacy-notice']);
        expect(textOf(root, `#${CONTACT_VALIDATION_FIXTURES.errorIds.name}`)).not.toBe(CONTACT_I18N.en.errors.name.required);
        expect(textOf(root, `#${CONTACT_VALIDATION_FIXTURES.errorIds.name}`)).not.toBe(CONTACT_I18N.pt.errors.name.required);
      }
    }

    fillValues(root, CONTACT_HTTP_FIXTURES.validSubmission);
    submitButton.click();
    await CONTACT_HTTP_FIXTURES.flushMicrotasks();
    httpMock.expectOne(CONTACT_HTTP_FIXTURES.contactEndpoint).error(CONTACT_HTTP_FIXTURES.createNetworkErrorEvent());
    await fixture.whenStable();
    fixture.detectChanges();

    for (const lang of CONTACT_I18N_FIXTURES.languages) {
      facade.setLanguage(lang);
      fixture.detectChanges();
      const expected = CONTACT_I18N[lang];

      expect(textOf(root, '.form-error-global__message')).toBe(expected['submission-errors'].network);
      expect(textOf(root, '.form-error-global__retry')).toBe(expected.retry);

      if (CONTACT_I18N_FIXTURES.nonFallbackLanguages.some((code) => code === lang)) {
        expect(textOf(root, '.form-error-global__message')).not.toBe(CONTACT_I18N.en['submission-errors'].network);
        expect(textOf(root, '.form-error-global__message')).not.toBe(CONTACT_I18N.pt['submission-errors'].network);
      }
    }

    submitButton.click();
    await CONTACT_HTTP_FIXTURES.flushMicrotasks();
    httpMock.expectOne(CONTACT_HTTP_FIXTURES.contactEndpoint).flush(CONTACT_HTTP_FIXTURES.successBody);
    await fixture.whenStable();
    fixture.detectChanges();

    facade.setLanguage('fr');
    fixture.detectChanges();
    expect(textOf(root, '.form-confirmation__title')).toBe(CONTACT_I18N.fr['success-title']);
    expect(textOf(root, '.form-confirmation__message')).toBe(CONTACT_I18N.fr['success-message']);
    expect(textOf(root, '.form-confirmation__action')).toBe(CONTACT_I18N.fr['send-another']);
    expect(textOf(root, '.form-confirmation__message')).not.toBe(CONTACT_I18N.en['success-message']);
    expect(textOf(root, '.form-confirmation__message')).not.toBe(CONTACT_I18N.pt['success-message']);
  });
});
