export const CONTACT_VALIDATION_FIXTURES = {
  validPaddedPayload: {
    name: '  Alex   Santos  ',
    email: '  sender@contact-test.invalid  ',
    message: '  Hello,\r\nthis is a valid inquiry.  ',
  },
  expectedNormalizedFields: {
    name: 'Alex Santos',
    email: 'sender@contact-test.invalid',
    message: 'Hello,\nthis is a valid inquiry.',
  },
  missingFieldsPayload: {
    name: '   ',
    email: '',
    message: 'short',
  },
  invalidEmails: [
    'plainaddress',
    'a@@contact-test.invalid',
    'bad\r\n@contact-test.invalid',
    'user@tld-only',
    `${'a'.repeat(65)}@contact-test.invalid`,
  ] as const,
  oversizedPayload: {
    name: 'n'.repeat(101),
    email: `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(58)}.invalid`,
    message: 'm'.repeat(2001),
  },
  headerInjectionInput: {
    rawName: 'Alex\r\nBcc: attacker@evil.invalid',
    rawHeaderWithUnicode: 'Alex\u2028Santos\u2029',
    fields: {
      name: 'Alex\r\nBcc: attacker@evil.invalid',
      email: 'sender@contact-test.invalid\nCc: attacker@evil.invalid',
      message: 'Line one\r\nLine two',
    },
    recipientMailbox: 'inbox@contact-test.invalid\r\nSubject: spoof',
  },
} as const;

export const CONTACT_SUBMISSION_FIXTURES = {
  fixedNow: 1_700_000_000_000,
  clientIp: '203.0.113.10',
  envConfig: {
    CONTACT_MAILBOX: 'inbox@contact-test.invalid',
    CONTACT_SMTP_PASSWORD: 'mock-smtp-credential',
    RECAPTCHA_SECRET_KEY: 'mock-recaptcha-secret',
  },
  validPayload: {
    name: 'Alex Santos',
    email: 'sender@contact-test.invalid',
    message: 'Hello, this is a valid contact message.',
    honeypot: '',
    recaptchaToken: 'mock-recaptcha-token',
  },
  honeypotPayload: {
    name: '',
    email: 'bad',
    message: '',
    honeypot: 'bot-trap-value',
  },
  invalidPayload: {
    name: 'A',
    email: 'not-an-email',
    message: 'short',
    recaptchaToken: 'mock-recaptcha-token',
  },
  missingTokenPayload: {
    name: 'Alex Santos',
    email: 'sender@contact-test.invalid',
    message: 'Hello, this is a valid contact message.',
  },
  recaptchaResponses: {
    valid: { success: true, score: 0.9 },
    rejected: { success: false },
  },
  mailerError: new Error('SMTP connection refused'),
  rateLimitOptions: {
    maxRequests: 2,
    windowMs: 60_000,
  },
} as const;
