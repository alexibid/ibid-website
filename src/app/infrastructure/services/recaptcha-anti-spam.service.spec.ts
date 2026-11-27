import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ANTI_SPAM_PRODUCTION, RECAPTCHA_SITE_KEY } from '../tokens/contact.tokens';
import { DEV_ANTI_SPAM_TOKEN, RecaptchaAntiSpamService } from './recaptcha-anti-spam.service';
import { ANTI_SPAM_FIXTURES } from '../../../mocks/contact-form.mock';

function queryRecaptchaScripts(): HTMLScriptElement[] {
  return Array.from(
    document.head.querySelectorAll(`script[src^="${ANTI_SPAM_FIXTURES.scriptUrlPrefix}"]`)
  ).filter((node): node is HTMLScriptElement => node instanceof HTMLScriptElement);
}

function createService(options: {
  readonly platformId: string;
  readonly siteKey: string;
  readonly isProduction: boolean;
}): RecaptchaAntiSpamService {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      { provide: PLATFORM_ID, useValue: options.platformId },
      { provide: RECAPTCHA_SITE_KEY, useValue: options.siteKey },
      { provide: ANTI_SPAM_PRODUCTION, useValue: options.isProduction }
    ]
  });
  return TestBed.inject(RecaptchaAntiSpamService);
}

describe('RecaptchaAntiSpamService', () => {
  afterEach(() => {
    vi.useRealTimers();
    for (const script of queryRecaptchaScripts()) {
      script.remove();
    }
    Reflect.deleteProperty(window, 'grecaptcha');
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('should lazily inject a single reCAPTCHA script on init and attach fresh tokens on repeated execute calls', async () => {
    const service = createService({
      platformId: 'browser',
      siteKey: ANTI_SPAM_FIXTURES.siteKey,
      isProduction: true
    });

    expect(queryRecaptchaScripts()).toHaveLength(0);

    service.init();
    const scripts = queryRecaptchaScripts();
    expect(scripts).toHaveLength(1);
    expect(scripts[0].src).toBe(
      `${ANTI_SPAM_FIXTURES.scriptUrlPrefix}?render=${encodeURIComponent(ANTI_SPAM_FIXTURES.siteKey)}`
    );
    expect(scripts[0].async).toBe(true);
    expect(scripts[0].defer).toBe(true);

    service.init();
    expect(queryRecaptchaScripts()).toHaveLength(1);

    const grecaptcha = ANTI_SPAM_FIXTURES.createMockGrecaptcha(ANTI_SPAM_FIXTURES.tokens);
    Reflect.set(window, 'grecaptcha', grecaptcha);

    const firstExecute = service.execute(ANTI_SPAM_FIXTURES.action);
    expect(queryRecaptchaScripts()).toHaveLength(1);

    scripts[0].dispatchEvent(new Event('load'));
    expect(await firstExecute).toBe(ANTI_SPAM_FIXTURES.tokens[0]);
    expect(await service.execute(ANTI_SPAM_FIXTURES.action)).toBe(ANTI_SPAM_FIXTURES.tokens[1]);
    expect(queryRecaptchaScripts()).toHaveLength(1);
    expect(grecaptcha.ready).toHaveBeenCalledTimes(2);
    expect(grecaptcha.execute).toHaveBeenNthCalledWith(1, ANTI_SPAM_FIXTURES.siteKey, {
      action: ANTI_SPAM_FIXTURES.action
    });
    expect(grecaptcha.execute).toHaveBeenNthCalledWith(2, ANTI_SPAM_FIXTURES.siteKey, {
      action: ANTI_SPAM_FIXTURES.action
    });
  });

  it('should return the dev token without injecting a script when non-production and unconfigured, and reject in production', async () => {
    const devService = createService({
      platformId: 'browser',
      siteKey: ANTI_SPAM_FIXTURES.emptySiteKey,
      isProduction: false
    });

    devService.init();
    expect(queryRecaptchaScripts()).toHaveLength(0);
    expect(await devService.execute(ANTI_SPAM_FIXTURES.action)).toBe(DEV_ANTI_SPAM_TOKEN);
    expect(queryRecaptchaScripts()).toHaveLength(0);

    const prodService = createService({
      platformId: 'browser',
      siteKey: '',
      isProduction: true
    });

    prodService.init();
    expect(queryRecaptchaScripts()).toHaveLength(0);
    await expect(prodService.execute(ANTI_SPAM_FIXTURES.action)).rejects.toThrow(
      'reCAPTCHA site key is not configured for production.'
    );
    expect(queryRecaptchaScripts()).toHaveLength(0);
  });

  it('should handle blocked, errored, or unavailable scripts cleanly and recover on retry', async () => {
    const service = createService({
      platformId: 'browser',
      siteKey: ANTI_SPAM_FIXTURES.siteKey,
      isProduction: true
    });

    const blockedAttempt = service.execute(ANTI_SPAM_FIXTURES.action);
    const [firstScript] = queryRecaptchaScripts();
    expect(firstScript).toBeDefined();
    firstScript.dispatchEvent(new Event('error'));
    await expect(blockedAttempt).rejects.toThrow('Failed to load reCAPTCHA script.');
    expect(queryRecaptchaScripts()).toHaveLength(0);

    const unavailableApiAttempt = service.execute(ANTI_SPAM_FIXTURES.action);
    const [secondScript] = queryRecaptchaScripts();
    expect(secondScript).toBeDefined();
    secondScript.dispatchEvent(new Event('load'));
    await expect(unavailableApiAttempt).rejects.toThrow('reCAPTCHA API is unavailable.');

    const grecaptcha = ANTI_SPAM_FIXTURES.createMockGrecaptcha(ANTI_SPAM_FIXTURES.tokens);
    Reflect.set(window, 'grecaptcha', grecaptcha);
    expect(await service.execute(ANTI_SPAM_FIXTURES.action)).toBe(ANTI_SPAM_FIXTURES.tokens[0]);
    expect(queryRecaptchaScripts()).toHaveLength(1);
  });

  it('should reject script loading on timeout and allow subsequent retry recovery', async () => {
    vi.useFakeTimers();
    const service = createService({
      platformId: 'browser',
      siteKey: ANTI_SPAM_FIXTURES.siteKey,
      isProduction: true
    });

    const timedOutAttempt = service.execute(ANTI_SPAM_FIXTURES.action);
    const rejectionAssertion = expect(timedOutAttempt).rejects.toThrow(
      'Timed out while loading reCAPTCHA script.'
    );
    expect(queryRecaptchaScripts()).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(ANTI_SPAM_FIXTURES.timeoutMs);
    await rejectionAssertion;
    expect(queryRecaptchaScripts()).toHaveLength(0);

    const grecaptcha = ANTI_SPAM_FIXTURES.createMockGrecaptcha(ANTI_SPAM_FIXTURES.tokens);
    const retryAttempt = service.execute(ANTI_SPAM_FIXTURES.action);
    const [retryScript] = queryRecaptchaScripts();
    expect(retryScript).toBeDefined();
    Reflect.set(window, 'grecaptcha', grecaptcha);
    retryScript.dispatchEvent(new Event('load'));
    expect(await retryAttempt).toBe(ANTI_SPAM_FIXTURES.tokens[0]);
  });

  it('should reject verification on SSR platforms without injecting a script', async () => {
    const ssrService = createService({
      platformId: 'server',
      siteKey: ANTI_SPAM_FIXTURES.siteKey,
      isProduction: true
    });

    ssrService.init();
    expect(queryRecaptchaScripts()).toHaveLength(0);
    await expect(ssrService.execute(ANTI_SPAM_FIXTURES.action)).rejects.toThrow(
      'Anti-spam verification is only available in the browser.'
    );
    expect(queryRecaptchaScripts()).toHaveLength(0);
  });
});
