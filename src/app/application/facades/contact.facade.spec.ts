import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PageType } from '../../domain/models/page-type.enum';
import { BYPASS_GLOBAL_ERROR, errorInterceptor } from '../../infrastructure/interceptors/error.interceptor';
import { UiErrorService } from '../../infrastructure/services/ui-error.service';
import { CONTACT_ENDPOINT, ANTI_SPAM_TOKEN_PORT } from '../../infrastructure/tokens/contact.tokens';
import { CONTENT_READ_REPOSITORY } from '../../infrastructure/tokens/content-repository.token';
import { ContactStore } from '../state/contact.store';
import { ContactFacade } from './contact.facade';
import { CONTACT_FORM_FIXTURES, createMockContentReadRepository, STATIC_HTML_FIXTURES } from '../../../mocks/static-html.mock';
import { CONTACT_HTTP_FIXTURES, CONTACT_VALIDATION_FIXTURES } from '../../../mocks/contact-form.mock';

describe('ContactFacade', () => {
  let facade: ContactFacade;
  let httpMock: HttpTestingController;
  let uiError: UiErrorService;
  let mockRepo: ReturnType<typeof createMockContentReadRepository>;
  let mockAntiSpam: ReturnType<typeof CONTACT_HTTP_FIXTURES.antiSpam.createMockPort>;

  const fillFields = (name: string, email: string, message: string): void => {
    facade.updateField('name', name);
    facade.updateField('email', email);
    facade.updateField('message', message);
  };

  beforeEach(() => {
    mockRepo = createMockContentReadRepository();
    mockAntiSpam = CONTACT_HTTP_FIXTURES.antiSpam.createMockPort(CONTACT_HTTP_FIXTURES.antiSpam.tokens);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        ContactFacade,
        { provide: CONTENT_READ_REPOSITORY, useValue: mockRepo },
        { provide: ANTI_SPAM_TOKEN_PORT, useValue: mockAntiSpam }
      ]
    });
    facade = TestBed.inject(ContactFacade);
    httpMock = TestBed.inject(HttpTestingController);
    uiError = TestBed.inject(UiErrorService);
  });

  afterEach(() => {
    vi.useRealTimers();
    httpMock.verify();
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('should load exit sections through CONTENT_READ_REPOSITORY', async () => {
    await facade.loadExitSections('pt');
    expect(mockRepo.loadSections).toHaveBeenCalledWith(PageType.Exit, 'pt');
    expect(facade.sections()).toEqual(STATIC_HTML_FIXTURES.exitSections);
  });

  it('should silently ignore honeypot submissions without sending', async () => {
    fillFields(CONTACT_FORM_FIXTURES.botName, CONTACT_FORM_FIXTURES.botEmail, CONTACT_FORM_FIXTURES.botMessage);
    facade.updateHoneypot(CONTACT_FORM_FIXTURES.honeypotValue);

    const result = await facade.submit();
    expect(result).toBe(true);
    expect(facade.submitStatus()).toBe('success');
    httpMock.expectNone(CONTACT_HTTP_FIXTURES.contactEndpoint);
  });

  it('should prevent double submissions while submitting', async () => {
    fillFields(CONTACT_FORM_FIXTURES.validName, CONTACT_FORM_FIXTURES.doubleSubmitEmail, CONTACT_FORM_FIXTURES.validMessage);

    const firstSubmit = facade.submit();
    expect(facade.isSubmitting()).toBe(true);

    const secondResult = await facade.submit();
    expect(secondResult).toBe(false);
    await CONTACT_HTTP_FIXTURES.flushMicrotasks();

    const req = httpMock.expectOne(CONTACT_HTTP_FIXTURES.contactEndpoint);
    httpMock.expectNone(CONTACT_HTTP_FIXTURES.contactEndpoint);
    req.flush(CONTACT_HTTP_FIXTURES.successBody);

    expect(await firstSubmit).toBe(true);
    expect(facade.isSubmitting()).toBe(false);
    expect(facade.submitStatus()).toBe('success');
  });

  it('should reset submission state and form values through explicit facade methods without writable form signals', async () => {
    const store = TestBed.inject(ContactStore);
    for (const exposedSignal of [
      facade.name,
      facade.email,
      facade.message,
      facade.honeypot,
      facade.errors,
      facade.isSubmitting,
      facade.submitStatus,
      facade.errorMessage,
      facade.sections,
      facade.isLoading
    ]) {
      expect('set' in exposedSignal).toBe(false);
      expect('update' in exposedSignal).toBe(false);
    }

    await facade.loadExitSections('pt');
    expect(facade.sections()).toEqual(store.sections());
    store.setLoading(true);
    expect(facade.isLoading()).toBe(store.isLoading());
    expect(facade.isLoading()).toBe(true);
    store.setLoading(false);
    expect(facade.isLoading()).toBe(store.isLoading());

    fillFields(CONTACT_FORM_FIXTURES.botName, CONTACT_FORM_FIXTURES.invalidEmail, CONTACT_FORM_FIXTURES.botMessage);
    facade.blurField('email');
    expect(facade.name()).toBe(store.values.name());
    expect(facade.email()).toBe(store.values.email());
    expect(facade.message()).toBe(store.values.message());
    expect(facade.errors()).toEqual({ email: CONTACT_VALIDATION_FIXTURES.expectedErrors.emailInvalid });
    expect(store.visibleErrors()).toEqual({ email: 'invalid' });

    facade.updateField('email', CONTACT_FORM_FIXTURES.botEmail);
    facade.updateHoneypot(CONTACT_FORM_FIXTURES.honeypotValue);
    expect(facade.honeypot()).toBe(store.values.honeypot());

    expect(await facade.submit()).toBe(true);
    expect(facade.submitStatus()).toBe(store.submitStatus());
    expect(facade.submitStatus()).toBe('success');

    store.startSubmitting();
    expect(facade.isSubmitting()).toBe(store.isSubmitting());
    expect(facade.isSubmitting()).toBe(true);
    store.markFailed('server');
    expect(facade.isSubmitting()).toBe(store.isSubmitting());
    expect(facade.submitStatus()).toBe(store.submitStatus());
    expect(facade.errorMessage()).toBe(store.errorMessage());
    expect(facade.errorMessage()).toBe(CONTACT_HTTP_FIXTURES.expectedSubmissionErrorKeys.server);

    facade.resetSubmission();
    expect(facade.submitStatus()).toBe(store.submitStatus());
    expect(facade.submitStatus()).toBe('idle');
    expect(facade.errorMessage()).toBe(store.errorMessage());

    fillFields(CONTACT_FORM_FIXTURES.validName, CONTACT_FORM_FIXTURES.validEmail, CONTACT_FORM_FIXTURES.validMessage);
    facade.updateHoneypot(CONTACT_FORM_FIXTURES.honeypotValue);
    facade.resetForm();

    expect(facade.name()).toBe('');
    expect(facade.email()).toBe('');
    expect(facade.message()).toBe('');
    expect(facade.honeypot()).toBe('');
    expect(facade.errors()).toEqual({});
    expect(facade.isSubmitting()).toBe(store.isSubmitting());
    expect(facade.submitStatus()).toBe('idle');
    expect(facade.submitStatus()).toBe(store.submitStatus());
    expect(facade.errorMessage()).toBe(store.errorMessage());
  });

  it('should reject whitespace-only, malformed email, and out-of-bounds inputs without making any network request', async () => {
    const { whitespaceInputs, nameBoundaries, emailBoundaries, messageBoundaries, formCases, expectedErrors } = CONTACT_VALIDATION_FIXTURES;

    fillFields(whitespaceInputs[1], whitespaceInputs[2], whitespaceInputs[1]);
    expect(await facade.submit()).toBe(false);
    httpMock.expectNone(CONTACT_HTTP_FIXTURES.contactEndpoint);
    expect(facade.errors()).toEqual({ name: expectedErrors.nameRequired, email: expectedErrors.emailRequired, message: expectedErrors.messageRequired });

    fillFields(nameBoundaries.tooShort, emailBoundaries.minLengthMalformed, messageBoundaries.tooLong);
    expect(await facade.submit()).toBe(false);
    httpMock.expectNone(CONTACT_HTTP_FIXTURES.contactEndpoint);
    expect(facade.errors()).toEqual({ name: expectedErrors.nameTooShort, email: expectedErrors.emailInvalid, message: expectedErrors.messageTooLong });

    fillFields(formCases.allValidPadded.name, formCases.allValidPadded.email, formCases.allValidPadded.message);
    const submitPromise = facade.submit();
    await CONTACT_HTTP_FIXTURES.flushMicrotasks();
    const req = httpMock.expectOne(CONTACT_HTTP_FIXTURES.contactEndpoint);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      ...formCases.normalizedPayload,
      recaptchaToken: CONTACT_HTTP_FIXTURES.antiSpam.tokens[0]
    });
    req.flush(CONTACT_HTTP_FIXTURES.successBody);

    expect(await submitPromise).toBe(true);
    expect(facade.errors()).toEqual({});
    expect(facade.submittedAttempted()).toBe(false);
    expect(facade.touched()).toEqual({ name: false, email: false, message: false });
  });

  it('should submit through HttpClient using injected CONTACT_ENDPOINT and BYPASS_GLOBAL_ERROR without triggering UiErrorService', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        ContactFacade,
        { provide: CONTENT_READ_REPOSITORY, useValue: mockRepo },
        { provide: CONTACT_ENDPOINT, useValue: CONTACT_HTTP_FIXTURES.customEndpoint },
        { provide: ANTI_SPAM_TOKEN_PORT, useValue: mockAntiSpam }
      ]
    });
    facade = TestBed.inject(ContactFacade);
    httpMock = TestBed.inject(HttpTestingController);
    uiError = TestBed.inject(UiErrorService);

    const { formCases } = CONTACT_VALIDATION_FIXTURES;
    fillFields(formCases.allValidPadded.name, formCases.allValidPadded.email, formCases.allValidPadded.message);

    const submitPromise = facade.submit();
    await CONTACT_HTTP_FIXTURES.flushMicrotasks();
    const req = httpMock.expectOne(CONTACT_HTTP_FIXTURES.customEndpoint);
    expect(req.request.method).toBe('POST');
    expect(req.request.context.get(BYPASS_GLOBAL_ERROR)).toBe(true);
    expect(req.request.body).toEqual({
      ...formCases.normalizedPayload,
      recaptchaToken: CONTACT_HTTP_FIXTURES.antiSpam.tokens[0]
    });
    req.flush(null, CONTACT_HTTP_FIXTURES.statusResponses.server);

    expect(await submitPromise).toBe(false);
    expect(uiError.currentError()).toBeNull();
    expect(facade.submitStatus()).toBe('error');
  });

  it('should handle request timeout after 15 seconds, cancel pending work cleanly, and keep typed text intact', async () => {
    vi.useFakeTimers();
    fillFields(CONTACT_FORM_FIXTURES.validName, CONTACT_FORM_FIXTURES.validEmail, CONTACT_FORM_FIXTURES.validMessage);

    const submitPromise = facade.submit();
    expect(facade.isSubmitting()).toBe(true);
    await CONTACT_HTTP_FIXTURES.flushMicrotasks();

    const req = httpMock.expectOne(CONTACT_HTTP_FIXTURES.contactEndpoint);
    await vi.advanceTimersByTimeAsync(CONTACT_HTTP_FIXTURES.timeoutMs);

    expect(await submitPromise).toBe(false);
    expect(req.cancelled).toBe(true);
    expect(facade.isSubmitting()).toBe(false);
    expect(facade.submitStatus()).toBe('error');
    expect(facade.submissionErrorCode()).toBe('timeout');
    expect(facade.errorMessage()).toBe(CONTACT_HTTP_FIXTURES.expectedSubmissionErrorKeys.timeout);
    expect(facade.name()).toBe(CONTACT_FORM_FIXTURES.validName);
    expect(facade.email()).toBe(CONTACT_FORM_FIXTURES.validEmail);
    expect(facade.message()).toBe(CONTACT_FORM_FIXTURES.validMessage);
  });
});
