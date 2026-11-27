import { afterEach, beforeEach, vi } from 'vitest';
import { handleContactSubmission } from './index.js';
import { CONTACT_SUBMISSION_FIXTURES } from './mocks/contact-fixtures.mock.js';
import { createSlidingWindowRateLimiter } from './rate-limiter.js';

const { sendMailMock, createTransportMock } = vi.hoisted(() => {
  const sendMail = vi.fn(async () => undefined);
  const createTransport = vi.fn(() => ({ sendMail }));
  return { sendMailMock: sendMail, createTransportMock: createTransport };
});

vi.mock('nodemailer', () => ({
  default: {
    createTransport: createTransportMock,
  },
}));

function createJsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('handleContactSubmission', () => {
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    savedEnv['CONTACT_MAILBOX'] = process.env['CONTACT_MAILBOX'];
    savedEnv['CONTACT_SMTP_PASSWORD'] = process.env['CONTACT_SMTP_PASSWORD'];
    savedEnv['RECAPTCHA_SECRET_KEY'] = process.env['RECAPTCHA_SECRET_KEY'];
    savedEnv['FUNCTIONS_EMULATOR'] = process.env['FUNCTIONS_EMULATOR'];
    delete process.env['FUNCTIONS_EMULATOR'];
    vi.clearAllMocks();
  });

  afterEach(() => {
    for (const key of Object.keys(savedEnv)) {
      const previous = savedEnv[key];
      if (previous === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previous;
      }
    }
    vi.restoreAllMocks();
  });

  it('should deliver a valid contact email reading mailbox and SMTP credentials exclusively from environment configuration', async () => {
    Object.assign(process.env, CONTACT_SUBMISSION_FIXTURES.envConfig);
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(createJsonResponse(CONTACT_SUBMISSION_FIXTURES.recaptchaResponses.valid));
    const rateLimiter = createSlidingWindowRateLimiter({
      ...CONTACT_SUBMISSION_FIXTURES.rateLimitOptions,
      now: () => CONTACT_SUBMISSION_FIXTURES.fixedNow,
    });

    const result = await handleContactSubmission(CONTACT_SUBMISSION_FIXTURES.validPayload, {
      clientIp: CONTACT_SUBMISSION_FIXTURES.clientIp,
      rateLimiter,
    });

    expect(result).toEqual({
      status: 200,
      body: { success: true, message: 'Message sent successfully' },
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(createTransportMock).toHaveBeenCalledWith({
      service: 'gmail',
      auth: {
        user: CONTACT_SUBMISSION_FIXTURES.envConfig.CONTACT_MAILBOX,
        pass: CONTACT_SUBMISSION_FIXTURES.envConfig.CONTACT_SMTP_PASSWORD,
      },
    });
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: CONTACT_SUBMISSION_FIXTURES.envConfig.CONTACT_MAILBOX,
        to: CONTACT_SUBMISSION_FIXTURES.envConfig.CONTACT_MAILBOX,
        replyTo: CONTACT_SUBMISSION_FIXTURES.validPayload.email,
      }),
    );
  });

  it('should return HTTP 500 when destination mailbox or SMTP credentials are missing from configuration', async () => {
    delete process.env['CONTACT_MAILBOX'];
    delete process.env['CONTACT_SMTP_PASSWORD'];
    process.env['RECAPTCHA_SECRET_KEY'] =
      CONTACT_SUBMISSION_FIXTURES.envConfig.RECAPTCHA_SECRET_KEY;
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      createJsonResponse(CONTACT_SUBMISSION_FIXTURES.recaptchaResponses.valid),
    );
    const rateLimiter = createSlidingWindowRateLimiter({
      ...CONTACT_SUBMISSION_FIXTURES.rateLimitOptions,
      now: () => CONTACT_SUBMISSION_FIXTURES.fixedNow,
    });

    const result = await handleContactSubmission(CONTACT_SUBMISSION_FIXTURES.validPayload, {
      clientIp: CONTACT_SUBMISSION_FIXTURES.clientIp,
      rateLimiter,
    });

    expect(result).toEqual({
      status: 500,
      body: { error: 'Contact delivery is not configured' },
    });
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it('should return HTTP 200 silently for a non-empty honeypot without calling verification or sending an email', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const rateLimiter = createSlidingWindowRateLimiter({
      ...CONTACT_SUBMISSION_FIXTURES.rateLimitOptions,
      now: () => CONTACT_SUBMISSION_FIXTURES.fixedNow,
    });

    const result = await handleContactSubmission(CONTACT_SUBMISSION_FIXTURES.honeypotPayload, {
      clientIp: CONTACT_SUBMISSION_FIXTURES.clientIp,
      rateLimiter,
    });

    expect(result).toEqual({ status: 200, body: { success: true } });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it('should return HTTP 400 for invalid payloads without calling verification or mailer', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const rateLimiter = createSlidingWindowRateLimiter({
      ...CONTACT_SUBMISSION_FIXTURES.rateLimitOptions,
      now: () => CONTACT_SUBMISSION_FIXTURES.fixedNow,
    });

    const result = await handleContactSubmission(CONTACT_SUBMISSION_FIXTURES.invalidPayload, {
      clientIp: CONTACT_SUBMISSION_FIXTURES.clientIp,
      rateLimiter,
    });

    expect(result.status).toBe(400);
    expect(result.body['fieldErrors']).toBeDefined();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it('should return HTTP 403 when verification token is missing or rejected even when sent directly', async () => {
    Object.assign(process.env, CONTACT_SUBMISSION_FIXTURES.envConfig);
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(createJsonResponse(CONTACT_SUBMISSION_FIXTURES.recaptchaResponses.rejected));
    const rateLimiter = createSlidingWindowRateLimiter({
      ...CONTACT_SUBMISSION_FIXTURES.rateLimitOptions,
      now: () => CONTACT_SUBMISSION_FIXTURES.fixedNow,
    });

    const missingTokenResult = await handleContactSubmission(
      CONTACT_SUBMISSION_FIXTURES.missingTokenPayload,
      {
        clientIp: CONTACT_SUBMISSION_FIXTURES.clientIp,
        rateLimiter,
      },
    );
    expect(missingTokenResult.status).toBe(403);
    expect(fetchSpy).not.toHaveBeenCalled();

    const rejectedTokenResult = await handleContactSubmission(
      CONTACT_SUBMISSION_FIXTURES.validPayload,
      {
        clientIp: CONTACT_SUBMISSION_FIXTURES.clientIp,
        rateLimiter,
      },
    );
    expect(rejectedTokenResult.status).toBe(403);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it('should return HTTP 429 with Retry-After when excessive requests exceed the rate limit', async () => {
    Object.assign(process.env, CONTACT_SUBMISSION_FIXTURES.envConfig);
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      createJsonResponse(CONTACT_SUBMISSION_FIXTURES.recaptchaResponses.valid),
    );
    const rateLimiter = createSlidingWindowRateLimiter({
      ...CONTACT_SUBMISSION_FIXTURES.rateLimitOptions,
      now: () => CONTACT_SUBMISSION_FIXTURES.fixedNow,
    });

    const first = await handleContactSubmission(CONTACT_SUBMISSION_FIXTURES.validPayload, {
      clientIp: CONTACT_SUBMISSION_FIXTURES.clientIp,
      rateLimiter,
    });
    const second = await handleContactSubmission(CONTACT_SUBMISSION_FIXTURES.validPayload, {
      clientIp: CONTACT_SUBMISSION_FIXTURES.clientIp,
      rateLimiter,
    });
    const third = await handleContactSubmission(CONTACT_SUBMISSION_FIXTURES.validPayload, {
      clientIp: CONTACT_SUBMISSION_FIXTURES.clientIp,
      rateLimiter,
    });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(third).toEqual({
      status: 429,
      headers: { 'Retry-After': '60' },
      body: { error: 'Too many requests' },
    });
    expect(sendMailMock).toHaveBeenCalledTimes(2);
  });

  it('should return HTTP 500 when email delivery fails', async () => {
    Object.assign(process.env, CONTACT_SUBMISSION_FIXTURES.envConfig);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      createJsonResponse(CONTACT_SUBMISSION_FIXTURES.recaptchaResponses.valid),
    );
    sendMailMock.mockRejectedValueOnce(CONTACT_SUBMISSION_FIXTURES.mailerError);
    const rateLimiter = createSlidingWindowRateLimiter({
      ...CONTACT_SUBMISSION_FIXTURES.rateLimitOptions,
      now: () => CONTACT_SUBMISSION_FIXTURES.fixedNow,
    });

    const result = await handleContactSubmission(CONTACT_SUBMISSION_FIXTURES.validPayload, {
      clientIp: CONTACT_SUBMISSION_FIXTURES.clientIp,
      rateLimiter,
    });

    expect(result).toEqual({
      status: 500,
      body: { error: 'Failed to send message' },
    });
  });
});
