import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { errorInterceptor } from '../../infrastructure/interceptors/error.interceptor';
import { UiErrorService } from '../../infrastructure/services/ui-error.service';
import { ANTI_SPAM_TOKEN_PORT } from '../../infrastructure/tokens/contact.tokens';
import { CONTENT_READ_REPOSITORY } from '../../infrastructure/tokens/content-repository.token';
import { ContactFacade } from './contact.facade';
import { CONTACT_FORM_FIXTURES, createMockContentReadRepository } from '../../../mocks/static-html.mock';
import { CONTACT_HTTP_FIXTURES } from '../../../mocks/contact-form.mock';

describe('ContactFacade anti-spam verification', () => {
  let facade: ContactFacade;
  let httpMock: HttpTestingController;
  let uiError: UiErrorService;
  let mockAntiSpam: ReturnType<typeof CONTACT_HTTP_FIXTURES.antiSpam.createMockPort>;

  const fillValidFields = (): void => {
    facade.updateField('name', CONTACT_FORM_FIXTURES.validName);
    facade.updateField('email', CONTACT_FORM_FIXTURES.validEmail);
    facade.updateField('message', CONTACT_FORM_FIXTURES.validMessage);
  };

  beforeEach(() => {
    mockAntiSpam = CONTACT_HTTP_FIXTURES.antiSpam.createMockPort(CONTACT_HTTP_FIXTURES.antiSpam.tokens);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        ContactFacade,
        { provide: CONTENT_READ_REPOSITORY, useValue: createMockContentReadRepository() },
        { provide: ANTI_SPAM_TOKEN_PORT, useValue: mockAntiSpam }
      ]
    });
    facade = TestBed.inject(ContactFacade);
    httpMock = TestBed.inject(HttpTestingController);
    uiError = TestBed.inject(UiErrorService);
  });

  afterEach(() => {
    httpMock.verify();
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('should execute verification to attach a fresh token on each genuine submission and skip verification on invalid, honeypot, or offline submits', async () => {
    facade.initAntiSpam();
    expect(mockAntiSpam.init).toHaveBeenCalledTimes(1);

    expect(await facade.submit()).toBe(false);

    facade.updateField('name', CONTACT_FORM_FIXTURES.botName);
    facade.updateField('email', CONTACT_FORM_FIXTURES.botEmail);
    facade.updateField('message', CONTACT_FORM_FIXTURES.botMessage);
    facade.updateHoneypot(CONTACT_FORM_FIXTURES.honeypotValue);
    expect(await facade.submit()).toBe(true);
    httpMock.expectNone(CONTACT_HTTP_FIXTURES.contactEndpoint);

    facade.updateHoneypot('');
    fillValidFields();
    const onLineSpy = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    expect(await facade.submit()).toBe(false);
    httpMock.expectNone(CONTACT_HTTP_FIXTURES.contactEndpoint);
    expect(mockAntiSpam.execute).not.toHaveBeenCalled();

    onLineSpy.mockReturnValue(true);
    for (const token of CONTACT_HTTP_FIXTURES.antiSpam.tokens) {
      fillValidFields();
      const pending = facade.submit();
      await CONTACT_HTTP_FIXTURES.flushMicrotasks();
      const req = httpMock.expectOne(CONTACT_HTTP_FIXTURES.contactEndpoint);
      expect(req.request.body.recaptchaToken).toBe(token);
      req.flush(CONTACT_HTTP_FIXTURES.successBody);
      expect(await pending).toBe(true);
    }

    expect(mockAntiSpam.execute).toHaveBeenCalledTimes(2);
    expect(mockAntiSpam.execute).toHaveBeenNthCalledWith(1, CONTACT_HTTP_FIXTURES.antiSpam.action);
    expect(mockAntiSpam.execute).toHaveBeenNthCalledWith(2, CONTACT_HTTP_FIXTURES.antiSpam.action);
  });

  it('should handle unavailable or blocked verification with a verification error instead of an unhandled exception', async () => {
    fillValidFields();
    mockAntiSpam.execute.mockRejectedValueOnce(CONTACT_HTTP_FIXTURES.antiSpam.blockedError);

    await expect(facade.submit()).resolves.toBe(false);
    httpMock.expectNone(CONTACT_HTTP_FIXTURES.contactEndpoint);
    expect(facade.isSubmitting()).toBe(false);
    expect(facade.submitStatus()).toBe('error');
    expect(facade.submissionErrorCode()).toBe('verification');
    expect(facade.errorMessage()).toBe(CONTACT_HTTP_FIXTURES.expectedSubmissionErrorKeys.verification);
    expect(uiError.currentError()).toBeNull();
    expect(facade.name()).toBe(CONTACT_FORM_FIXTURES.validName);
    expect(facade.email()).toBe(CONTACT_FORM_FIXTURES.validEmail);
    expect(facade.message()).toBe(CONTACT_FORM_FIXTURES.validMessage);

    mockAntiSpam.execute.mockResolvedValueOnce(CONTACT_HTTP_FIXTURES.antiSpam.blankToken);
    await expect(facade.submit()).resolves.toBe(false);
    httpMock.expectNone(CONTACT_HTTP_FIXTURES.contactEndpoint);
    expect(facade.submissionErrorCode()).toBe('verification');

    const retry = facade.submit();
    await CONTACT_HTTP_FIXTURES.flushMicrotasks();
    httpMock.expectOne(CONTACT_HTTP_FIXTURES.contactEndpoint).flush(CONTACT_HTTP_FIXTURES.successBody);
    expect(await retry).toBe(true);
    expect(facade.submitStatus()).toBe('success');
  });
});
