import { computed, signal, type WritableSignal } from '@angular/core';
import { deepComputed } from '@ngrx/signals';
import { vi, type Mock } from 'vitest';
import type { ContactFacade, ContactFormErrors } from '../app/application/facades/contact.facade';
import type { ChapterEstimator } from '../app/application/state/state.service';
import {
  CONTACT_FIELD_ERROR_KEYS, CONTACT_I18N, CONTACT_SUBMISSION_ERROR_KEYS
} from '../app/domain/constants/contact-i18n';
import { isSupportedLanguage, type SupportedLanguage } from '../app/domain/constants/languages';
import type { CmsPage } from '../app/domain/models/cms.interface';
import type {
  ContactFieldErrorCode, ContactFieldErrors, ContactFieldName, ContactFormValues,
  ContactSubmissionErrorCode, ContactSubmitStatus, ContactTouchedState, ContactValidationResult
} from '../app/domain/models/contact.model';
import { PageType } from '../app/domain/models/page-type.enum';
import { CONTACT_FIELD_ORDER, validateContactForm } from '../app/domain/validators/contact-form.validator';
import type { I18nService } from '../app/infrastructure/services/i18n.service';

export type MockContactSubmitHandler = (values: ContactFormValues) => boolean | Promise<boolean>;

type ContactFacadePublicApi = Pick<ContactFacade, keyof ContactFacade>;

export interface MockContactFacade extends ContactFacadePublicApi {
  readonly initAntiSpam: Mock<() => void>;
  readonly updateField: Mock<(field: ContactFieldName, value: string) => void>;
  readonly updateHoneypot: Mock<(value: string) => void>;
  readonly blurField: Mock<(field: ContactFieldName) => void>;
  readonly validateForm: Mock<() => boolean>;
  readonly submit: Mock<() => Promise<boolean>>;
  readonly cancelPendingSubmission: Mock<() => void>;
  readonly resetSubmission: Mock<() => void>;
  readonly resetForm: Mock<() => void>;
  readonly loadExitSections: Mock<(lang: string) => Promise<void>>;
  readonly setLanguage: Mock<(lang: string) => void>;
  readonly setPageCount: Mock<(slug: string, count: number) => void>;
  readonly syncBookPagination: Mock<(host: HTMLElement, estimate: ChapterEstimator) => Promise<void>>;
  readonly setSubmitHandler: (handler: MockContactSubmitHandler | null) => void;
  readonly setSubmitting: (value: boolean) => void;
  readonly setSubmitStatus: (status: ContactSubmitStatus) => void;
  readonly setErrorMessage: (message: string) => void;
  readonly setSubmissionError: (code: ContactSubmissionErrorCode | null) => void;
  readonly setErrors: (errors: ContactFormErrors | null) => void;
  readonly setSections: (sections: readonly CmsPage[]) => void;
  readonly setLoading: (value: boolean) => void;
  readonly setDesktop: (value: boolean) => void;
  readonly setDynamicRouteOrder: (order: readonly string[]) => void;
  readonly setBrowser: (value: boolean) => void;
}

interface PendingMockSubmission {
  readonly resolve: (value: boolean) => void;
}

const EXIT_TITLES: Readonly<Record<SupportedLanguage, { readonly contact: string; readonly about: string; readonly backCover: string }>> = {
  pt: { contact: 'Formulário de Contacto', about: 'Contactos e ligações', backCover: 'Obrigado' },
  en: { contact: 'Contact Form', about: 'Contacts and Links', backCover: 'Thank you' },
  es: { contact: 'Formulario de Contacto', about: 'Contactos y enlaces', backCover: 'Gracias' },
  fr: { contact: 'Formulaire de Contact', about: 'Contacts et liens', backCover: 'Merci' },
  de: { contact: 'Kontaktformular', about: 'Kontakte und Links', backCover: 'Danke' }
};

export function buildMockExitSections(rawLang: string): readonly CmsPage[] {
  const lang: SupportedLanguage = isSupportedLanguage(rawLang) ? rawLang : 'pt';
  const titles = EXIT_TITLES[lang];
  const copy = CONTACT_I18N[lang];
  return [
    { id: `${lang}-exit-contact-form`, title: titles.contact, content: `<p>${copy['info-title']}</p>`, type: PageType.Exit, lang, metadata: { location: 'contact-form' } },
    { id: `${lang}-exit-about`, title: titles.about, content: `<p>${copy.socials}</p>`, type: PageType.Exit, lang, metadata: { location: 'about' } },
    { id: `${lang}-exit-back-cover`, title: titles.backCover, content: `<p>${copy['success-title']}</p>`, type: PageType.Exit, lang, metadata: { location: 'back-cover' } }
  ];
}

function mapVisibleErrors(visible: ContactFieldErrors): ContactFormErrors {
  const mapped: Partial<Record<ContactFieldName, string>> = {};
  for (const field of CONTACT_FIELD_ORDER) {
    const code = visible[field];
    if (code === undefined) continue;
    const fieldKeys: Readonly<Partial<Record<ContactFieldErrorCode, string>>> = CONTACT_FIELD_ERROR_KEYS[field];
    const key = fieldKeys[code];
    if (key !== undefined) mapped[field] = key;
  }
  return mapped;
}

function findFirstOverrideInvalidField(errors: ContactFormErrors): ContactFieldName | null {
  return CONTACT_FIELD_ORDER.find((field) => errors[field] !== undefined) ?? null;
}

export function createMockContactFacade(i18n: I18nService): MockContactFacade {
  i18n.registerNamespace('contacts', CONTACT_I18N);
  let browserFlag = true;
  let sectionsOverridden = false;
  let submitHandler: MockContactSubmitHandler | null = null;
  let pendingSubmission: PendingMockSubmission | undefined;

  const sectionsSignal = signal<readonly CmsPage[]>(buildMockExitSections(i18n.currentLangCode()));
  const isLoadingSignal = signal(false);
  const fieldSignals: Readonly<Record<ContactFieldName, WritableSignal<string>>> = {
    name: signal(''), email: signal(''), message: signal('')
  };
  const honeypotSignal = signal('');
  const touchedSignal = signal<ContactTouchedState>({ name: false, email: false, message: false });
  const submittedAttemptedSignal = signal(false);
  const isSubmittingSignal = signal(false);
  const submitStatusSignal = signal<ContactSubmitStatus>('idle');
  const errorMessageSignal = signal('');
  const submissionErrorCodeSignal = signal<ContactSubmissionErrorCode | null>(null);
  const isDesktopSignal = signal(true);
  const dynamicRouteOrderSignal = signal<string[]>([]);
  const errorsOverrideSignal = signal<ContactFormErrors | null>(null);

  const readValues = (): ContactFormValues => ({
    name: fieldSignals.name(), email: fieldSignals.email(), message: fieldSignals.message()
  });
  const validationResult = computed<ContactValidationResult>(() => validateContactForm(readValues()));
  const rawErrors = computed<ContactFieldErrors>(() => validationResult().errors);
  const visibleErrors = computed<ContactFieldErrors>(() => {
    const [allErrors, touched, attempted] = [rawErrors(), touchedSignal(), submittedAttemptedSignal()];
    const visible: ContactFieldErrors = {};
    for (const field of CONTACT_FIELD_ORDER) {
      const code = allErrors[field];
      if (code !== undefined && (touched[field] || attempted)) visible[field] = code;
    }
    return visible;
  });
  const firstInvalidField = computed<ContactFieldName | null>(() => {
    const override = errorsOverrideSignal();
    return override !== null ? findFirstOverrideInvalidField(override) : validationResult().firstInvalidField;
  });
  const isValid = computed<boolean>(() =>
    errorsOverrideSignal() !== null ? firstInvalidField() === null : validationResult().valid
  );
  const errors = computed<ContactFormErrors>(() => errorsOverrideSignal() ?? mapVisibleErrors(visibleErrors()));

  const clearSubmissionState = (): void => {
    submitStatusSignal.set('idle');
    errorMessageSignal.set('');
    submissionErrorCodeSignal.set(null);
  };

  const resetFieldValues = (): void => {
    for (const field of CONTACT_FIELD_ORDER) fieldSignals[field].set('');
    honeypotSignal.set('');
    touchedSignal.set({ name: false, email: false, message: false });
    submittedAttemptedSignal.set(false);
    errorsOverrideSignal.set(null);
  };

  const markSucceeded = (): void => {
    resetFieldValues();
    isSubmittingSignal.set(false);
    clearSubmissionState();
    submitStatusSignal.set('success');
  };

  const settleSubmissionError = (submission: PendingMockSubmission, fallbackCode: ContactSubmissionErrorCode): void => {
    if (pendingSubmission !== submission) return;
    pendingSubmission = undefined;
    isSubmittingSignal.set(false);
    if (submitStatusSignal() !== 'error') submitStatusSignal.set('error');
    if (!errorMessageSignal()) {
      submissionErrorCodeSignal.set(fallbackCode);
      errorMessageSignal.set(CONTACT_SUBMISSION_ERROR_KEYS[fallbackCode]);
    }
    submission.resolve(false);
  };

  const succeedSubmission = (submission: PendingMockSubmission): void => {
    if (pendingSubmission !== submission) return;
    pendingSubmission = undefined;
    markSucceeded();
    submission.resolve(true);
  };

  const validateForm = vi.fn<() => boolean>(() => {
    submittedAttemptedSignal.set(true);
    return isValid();
  });

  const cancelPendingSubmission = vi.fn<() => void>(() => {
    const pending = pendingSubmission;
    if (pending === undefined) return;
    pendingSubmission = undefined;
    isSubmittingSignal.set(false);
    clearSubmissionState();
    pending.resolve(false);
  });

  const submit = vi.fn<() => Promise<boolean>>(() => {
    if (isSubmittingSignal() || pendingSubmission !== undefined) return Promise.resolve(false);
    clearSubmissionState();
    if (!validateForm()) return Promise.resolve(false);
    if (honeypotSignal().trim() || submitHandler === null) {
      markSucceeded();
      return Promise.resolve(true);
    }
    isSubmittingSignal.set(true);
    const activeHandler = submitHandler;
    return new Promise<boolean>((resolve) => {
      const current: PendingMockSubmission = { resolve };
      pendingSubmission = current;
      try {
        Promise.resolve(activeHandler(readValues())).then(
          (accepted) => (accepted ? succeedSubmission(current) : settleSubmissionError(current, 'server')),
          () => settleSubmissionError(current, 'unknown')
        );
      } catch {
        settleSubmissionError(current, 'unknown');
      }
    });
  });

  return {
    get isBrowser(): boolean { return browserFlag; },
    sections: sectionsSignal.asReadonly(),
    isLoading: isLoadingSignal.asReadonly(),
    name: fieldSignals.name.asReadonly(),
    email: fieldSignals.email.asReadonly(),
    message: fieldSignals.message.asReadonly(),
    honeypot: honeypotSignal.asReadonly(),
    touched: deepComputed(() => touchedSignal()),
    submittedAttempted: submittedAttemptedSignal.asReadonly(),
    isSubmitting: isSubmittingSignal.asReadonly(),
    submitStatus: submitStatusSignal.asReadonly(),
    errorMessage: errorMessageSignal.asReadonly(),
    submissionErrorCode: submissionErrorCodeSignal.asReadonly(),
    validationResult,
    rawErrors,
    visibleErrors,
    isValid,
    firstInvalidField,
    currentLang: i18n.currentLangCode.asReadonly(),
    isDesktop: isDesktopSignal.asReadonly(),
    dynamicRouteOrder: dynamicRouteOrderSignal.asReadonly(),
    errors,
    initAntiSpam: vi.fn<() => void>(),
    updateField: vi.fn<(field: ContactFieldName, value: string) => void>((field, value) => {
      fieldSignals[field].set(value);
      if (submitStatusSignal() !== 'idle') clearSubmissionState();
    }),
    updateHoneypot: vi.fn<(value: string) => void>((value) => honeypotSignal.set(value)),
    blurField: vi.fn<(field: ContactFieldName) => void>((field) => {
      if (!touchedSignal()[field]) touchedSignal.update((current) => ({ ...current, [field]: true }));
    }),
    validateForm,
    submit,
    cancelPendingSubmission,
    resetSubmission: vi.fn<() => void>(clearSubmissionState),
    resetForm: vi.fn<() => void>(() => {
      cancelPendingSubmission();
      resetFieldValues();
      isSubmittingSignal.set(false);
      clearSubmissionState();
    }),
    loadExitSections: vi.fn<(lang: string) => Promise<void>>(async (lang) => {
      if (!sectionsOverridden) sectionsSignal.set(buildMockExitSections(lang));
    }),
    setLanguage: vi.fn<(lang: string) => void>((lang) => i18n.setLanguage(lang)),
    setPageCount: vi.fn<(slug: string, count: number) => void>(),
    syncBookPagination: vi.fn<ContactFacade['syncBookPagination']>(async () => undefined),
    setSubmitHandler: (handler) => { submitHandler = handler; },
    setSubmitting: (value) => { isSubmittingSignal.set(value); },
    setSubmitStatus: (status) => { submitStatusSignal.set(status); },
    setErrorMessage: (message) => { errorMessageSignal.set(message); },
    setSubmissionError: (code) => {
      if (code === null) {
        clearSubmissionState();
        return;
      }
      submissionErrorCodeSignal.set(code);
      errorMessageSignal.set(CONTACT_SUBMISSION_ERROR_KEYS[code]);
      submitStatusSignal.set('error');
    },
    setErrors: (nextErrors) => { errorsOverrideSignal.set(nextErrors); },
    setSections: (sections) => {
      sectionsOverridden = true;
      sectionsSignal.set(sections);
    },
    setLoading: (value) => { isLoadingSignal.set(value); },
    setDesktop: (value) => { isDesktopSignal.set(value); },
    setDynamicRouteOrder: (order) => { dynamicRouteOrderSignal.set([...order]); },
    setBrowser: (value) => { browserFlag = value; }
  };
}
