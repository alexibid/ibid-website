import { HttpErrorResponse } from '@angular/common/http';
import { TimeoutError } from 'rxjs';
import { vi } from 'vitest';
import type { CmsPage } from '../app/domain/models/cms.interface';
import { PageType } from '../app/domain/models/page-type.enum';
import type { AntiSpamTokenPort } from '../app/domain/ports/anti-spam-token.port';

export interface MockAntiSpamPort extends AntiSpamTokenPort {
  init: ReturnType<typeof vi.fn<() => void>>;
  execute: ReturnType<typeof vi.fn<(action: string) => Promise<string>>>;
}

export const ANTI_SPAM_FIXTURES = {
  siteKey: 'test-recaptcha-site-key',
  emptySiteKey: '   ',
  action: 'contact_submit',
  scriptUrlPrefix: 'https://www.google.com/recaptcha/api.js',
  defaultToken: 'mock-anti-spam-token-1',
  tokens: ['mock-anti-spam-token-1', 'mock-anti-spam-token-2'] as const,
  blankToken: '   ',
  timeoutMs: 10_000,
  blockedError: new Error('reCAPTCHA script blocked'),
  createMockPort: (tokens: readonly string[] = ['mock-anti-spam-token-1']): MockAntiSpamPort => {
    let callIndex = 0;
    return {
      init: vi.fn<() => void>(),
      execute: vi.fn<(action: string) => Promise<string>>(async () => tokens[Math.min(callIndex++, tokens.length - 1)] ?? 'mock-anti-spam-token-1')
    };
  },
  createMockGrecaptcha: (tokens: readonly string[] = ['mock-anti-spam-token-1']) => {
    let callIndex = 0;
    const execute = vi.fn((_siteKey: string, _options: { readonly action: string }) =>
      Promise.resolve(tokens[Math.min(callIndex++, tokens.length - 1)] ?? 'mock-anti-spam-token-1')
    );
    const ready = vi.fn((callback: () => void) => callback());
    return { ready, execute };
  }
} as const;

const EXIT_CONTACT_SECTION: CmsPage = {
  id: 'exit-pt-contact',
  title: 'Contactos',
  content: '<p>Contactos PT</p><p class="contact-privacy">Privacidade</p>',
  type: PageType.Exit,
  lang: 'pt',
  metadata: { location: 'contact-form' }
};

const EXIT_ABOUT_SECTION: CmsPage = {
  id: 'exit-pt-about',
  title: 'Sobre',
  content: '<p>Sobre o livro</p>',
  type: PageType.Exit,
  lang: 'pt',
  metadata: { location: 'about' }
};

const EXIT_BACK_COVER_SECTION: CmsPage = {
  id: 'exit-pt-back-cover',
  title: 'Obrigado',
  content: '<p>Mensagem enviada</p>',
  type: PageType.Exit,
  lang: 'pt',
  metadata: { location: 'back-cover' }
};

export const CONTACT_LAYOUT_FIXTURES = {
  exitLang: 'pt',
  fullExitSections: [EXIT_CONTACT_SECTION, EXIT_ABOUT_SECTION, EXIT_BACK_COVER_SECTION] as readonly CmsPage[],
  mobileViewport: { isDesktop: false, width: 375, height: 667 },
  desktopViewport: { isDesktop: true, width: 1000, height: 765 },
  balancedScrollWidth: 1000,
  unbalancedScrollWidth: 1500,
  paddedScrollWidth: 2000,
  postSubmitScrollWidth: 1200,
  minTouchTargetRem: '2.75rem',
  textareaMinHeightRem: '6.5rem',
  reducedMotionQuery: '(prefers-reduced-motion: reduce)',
  validSubmission: {
    name: 'Alex',
    email: 'test@example.com',
    message: 'Hello, this is a valid message.'
  },
  invalidSubmission: {
    name: 'Alex',
    email: 'invalid-email',
    message: 'Hello, this is a valid message.'
  },
  expectedErrors: {
    name: 'O nome é obrigatório.',
    email: 'O e-mail é obrigatório.',
    invalidEmail: 'Introduza um e-mail válido.',
    message: 'A mensagem é obrigatória.',
    network: 'Não foi possível enviar a mensagem devido a um erro de ligação.',
    retry: 'Por favor, tente novamente.'
  },
  createSuccessResponse: () => new Response(null, { status: 200 })
} as const;

export function createMatchMediaMock(matches: boolean): (query: string) => MediaQueryList {
  return vi.fn((query: string): MediaQueryList => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => false)
  }));
}

const MAX_LOCAL_PART = 'a'.repeat(64);
const DOMAIN_LABEL_63_A = 'b'.repeat(63);
const DOMAIN_LABEL_63_B = 'c'.repeat(63);

export const CONTACT_VALIDATION_FIXTURES = {
  whitespaceInputs: ['', '   ', '\t\n  '] as const,
  nameBoundaries: {
    tooShort: 'A',
    tooShortPadded: '  A  ',
    minValid: 'Ab',
    minValidPadded: '  Ab  ',
    maxValid: 'n'.repeat(100),
    tooLong: 'n'.repeat(101)
  },
  emailBoundaries: {
    tooShort: 'a@bc',
    minLengthMalformed: 'a@b.c',
    minValid: 'a@b.cd',
    maxValid: `${MAX_LOCAL_PART}@${DOMAIN_LABEL_63_A}.${DOMAIN_LABEL_63_B}.${'d'.repeat(57)}.com`,
    tooLong: `${MAX_LOCAL_PART}@${DOMAIN_LABEL_63_A}.${DOMAIN_LABEL_63_B}.${'d'.repeat(58)}.com`
  },
  messageBoundaries: {
    tooShort: '123456789',
    tooShortCrlf: '1234\r\n5678',
    minValid: '1234567890',
    minValidPadded: '  12345\n6789  ',
    maxValid: 'm'.repeat(2000),
    tooLong: 'm'.repeat(2001)
  },
  validEmails: [
    'alex@example.com',
    'alex.santos+tag@sub.example.co.uk',
    'user@example.xn--p1ai',
    `${MAX_LOCAL_PART}@example.com`
  ] as const,
  paddedValidEmail: '  alex@example.com  ',
  invalidEmails: [
    'plainaddress',
    'a@@example.com',
    '.alex@example.com',
    'alex.@example.com',
    'al..ex@example.com',
    'alex@.example.com',
    'alex@example..com',
    'alex@-example.com',
    'alex@example-.com',
    'alex@example',
    'alex@example.c',
    'al ex@example.com',
    `${'a'.repeat(65)}@example.com`
  ] as const,
  formCases: {
    allInvalid: { name: '   ', email: 'bad', message: 'short' },
    emailFirstInvalid: { name: 'Alex', email: 'bad', message: 'short' },
    messageFirstInvalid: { name: 'Alex', email: 'alex@example.com', message: 'short' },
    allValidPadded: {
      name: '  Alex   Santos  ',
      email: '  alex@example.com  ',
      message: '  Hello,\r\nthis is valid!  '
    },
    normalizedPayload: {
      name: 'Alex Santos',
      email: 'alex@example.com',
      message: 'Hello,\nthis is valid!',
      honeypot: ''
    }
  },
  expectedErrors: {
    nameRequired: 'contacts.errors.name.required',
    nameTooShort: 'contacts.errors.name.tooShort',
    nameTooLong: 'contacts.errors.name.tooLong',
    emailRequired: 'contacts.errors.email.required',
    emailTooShort: 'contacts.errors.email.tooShort',
    emailTooLong: 'contacts.errors.email.tooLong',
    emailInvalid: 'contacts.errors.email.invalid',
    messageRequired: 'contacts.errors.message.required',
    messageTooShort: 'contacts.errors.message.tooShort',
    messageTooLong: 'contacts.errors.message.tooLong'
  },
  localizedErrorsPt: {
    nameRequired: 'O nome é obrigatório.',
    emailInvalid: 'Introduza um e-mail válido.',
    emailTooShort: 'Mínimo de 5 caracteres.',
    messageTooShort: 'Mínimo de 10 caracteres.'
  },
  errorIds: {
    name: 'name-error',
    email: 'email-error',
    message: 'message-error'
  },
  createSuccessResponse: () => new Response(null, { status: 200 })
} as const;

export const CONTACT_I18N_FIXTURES = {
  languages: ['pt', 'en', 'es', 'fr', 'de'] as const,
  nonFallbackLanguages: ['es', 'fr', 'de'] as const,
  topLevelKeys: [
    'socials',
    'maps',
    'name',
    'name-placeholder',
    'email',
    'email-placeholder',
    'message',
    'message-placeholder',
    'submit',
    'info-title',
    'loading',
    'submitting',
    'success-title',
    'success-message',
    'send-another',
    'retry',
    'privacy-notice'
  ] as const,
  distinctKeys: [
    'submit',
    'loading',
    'submitting',
    'success-message',
    'send-another',
    'retry',
    'privacy-notice'
  ] as const,
  expectedSubmissionErrorKeys: {
    offline: 'contacts.submission-errors.offline',
    network: 'contacts.submission-errors.network',
    timeout: 'contacts.submission-errors.timeout',
    validation: 'contacts.submission-errors.validation',
    verification: 'contacts.submission-errors.verification',
    rateLimit: 'contacts.submission-errors.rateLimit',
    server: 'contacts.submission-errors.server',
    unknown: 'contacts.submission-errors.unknown'
  } as const,
  sampleTranslations: {
    pt: { submit: 'Enviar Mensagem', retry: 'Por favor, tente novamente.', nameRequired: 'O nome é obrigatório.' },
    en: { submit: 'Send Message', retry: 'Please try again.', nameRequired: 'Name is required.' },
    es: { submit: 'Enviar mensaje', retry: 'Por favor, inténtelo de nuevo.', nameRequired: 'El nombre es obligatorio.' },
    fr: { submit: 'Envoyer le message', retry: 'Veuillez réessayer.', nameRequired: 'Le nom est requis.' },
    de: { submit: 'Nachricht senden', retry: 'Bitte versuchen Sie es erneut.', nameRequired: 'Der Name ist erforderlich.' }
  } as const,
  createServerErrorResponse: () => new Response(null, { status: 500 }),
  networkFailureError: new Error('Network failure'),
  nonErrorRejection: 'unexpected-rejection'
} as const;

export const CONTACT_HTTP_FIXTURES = {
  contactEndpoint: '/api/v1/contact',
  customEndpoint: '/custom/contact-submit',
  timeoutMs: 15_000,
  successBody: { success: true },
  validSubmission: {
    name: 'Alex',
    email: 'test@example.com',
    message: 'Hello, this is a valid message.'
  },
  statusResponses: {
    validation: { status: 400, statusText: 'Bad Request' },
    verification: { status: 403, statusText: 'Forbidden' },
    rateLimit: { status: 429, statusText: 'Too Many Requests' },
    server: { status: 500, statusText: 'Internal Server Error' },
    unavailable: { status: 503, statusText: 'Service Unavailable' }
  },
  expectedSubmissionErrorKeys: CONTACT_I18N_FIXTURES.expectedSubmissionErrorKeys,
  antiSpam: ANTI_SPAM_FIXTURES,
  flushMicrotasks: async (): Promise<void> => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  },
  createNetworkErrorEvent: () => new ProgressEvent('error'),
  mapperCases: {
    networkError: new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' }),
    validationError: new HttpErrorResponse({ status: 400, statusText: 'Bad Request' }),
    verificationError: new HttpErrorResponse({ status: 403, statusText: 'Forbidden' }),
    rateLimitError: new HttpErrorResponse({ status: 429, statusText: 'Too Many Requests' }),
    serverError500: new HttpErrorResponse({ status: 500, statusText: 'Internal Server Error' }),
    serverError503: new HttpErrorResponse({ status: 503, statusText: 'Service Unavailable' }),
    rxjsTimeoutError: new TimeoutError(),
    namedTimeoutError: Object.assign(new Error('Request timed out'), { name: 'TimeoutError' }),
    genericError: new Error('Unexpected failure'),
    nonErrorValue: 'unexpected-rejection'
  }
} as const;
