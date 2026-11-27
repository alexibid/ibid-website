export const CONTACT_DEV_FIXTURES = {
  validSubmission: {
    name: 'Alex Santos',
    email: 'sender@contact-test.invalid',
    message: 'Hello, this is a valid dev message.',
    honeypot: '',
    recaptchaToken: 'mock-dev-token',
  },
  honeypotSubmission: {
    name: '',
    email: 'invalid',
    message: '',
    honeypot: 'bot-trap',
  },
  invalidPayloads: {
    missingName: {
      name: '   ',
      email: 'sender@contact-test.invalid',
      message: 'Hello, this is a valid dev message.',
      recaptchaToken: 'mock-dev-token',
    },
    headerBreakEmail: {
      name: 'Alex Santos',
      email: 'bad\r\n@contact-test.invalid',
      message: 'Hello, this is a valid dev message.',
      recaptchaToken: 'mock-dev-token',
    },
    tooLongMessage: {
      name: 'Alex Santos',
      email: 'sender@contact-test.invalid',
      message: 'm'.repeat(2001),
      recaptchaToken: 'mock-dev-token',
    },
  },
  missingTokenSubmission: {
    name: 'Alex Santos',
    email: 'sender@contact-test.invalid',
    message: 'Hello, this is a valid dev message.',
  },
} as const;
