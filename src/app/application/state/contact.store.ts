import { type Signal, computed } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withProps,
  withState
} from '@ngrx/signals';
import { CONTACT_SUBMISSION_ERROR_KEYS } from '../../domain/constants/contact-i18n';
import type { CmsPage } from '../../domain/models/cms.interface';
import type {
  ContactFieldErrors,
  ContactFieldName,
  ContactFormValues,
  ContactSubmissionErrorCode,
  ContactSubmitStatus,
  ContactTouchedState
} from '../../domain/models/contact.model';
import {
  CONTACT_FIELD_ORDER,
  validateContactForm
} from '../../domain/validators/contact-form.validator';

export interface ContactStoreValues extends ContactFormValues {
  readonly honeypot: string;
}

export interface ContactValueSignals {
  readonly name: Signal<string>;
  readonly email: Signal<string>;
  readonly message: Signal<string>;
  readonly honeypot: Signal<string>;
}

export interface ContactStoreState {
  readonly sections: readonly CmsPage[];
  readonly isLoading: boolean;
  readonly _values: ContactStoreValues;
  readonly touched: ContactTouchedState;
  readonly submittedAttempted: boolean;
  readonly isSubmitting: boolean;
  readonly submitStatus: ContactSubmitStatus;
  readonly submissionErrorCode: ContactSubmissionErrorCode | null;
  readonly errorMessage: string;
}

type ContactFormSliceState = Omit<ContactStoreState, 'sections' | 'isLoading'>;
type ContactSubmissionSliceState = Pick<
  ContactStoreState,
  'submitStatus' | 'errorMessage' | 'submissionErrorCode'
>;

function createIdleSubmissionState(): ContactSubmissionSliceState {
  return {
    submitStatus: 'idle',
    errorMessage: '',
    submissionErrorCode: null
  };
}

export function createInitialContactFormState(): ContactFormSliceState {
  return {
    _values: { name: '', email: '', message: '', honeypot: '' },
    touched: { name: false, email: false, message: false },
    submittedAttempted: false,
    isSubmitting: false,
    ...createIdleSubmissionState()
  };
}

export function createInitialContactStoreState(): ContactStoreState {
  return {
    sections: [],
    isLoading: false,
    ...createInitialContactFormState()
  };
}

export const ContactStore = signalStore(
  { providedIn: 'root' },
  withState(createInitialContactStoreState),
  withProps((store): { readonly values: ContactValueSignals } => ({
    values: {
      name: computed(() => store._values().name),
      email: computed(() => store._values().email),
      message: computed(() => store._values().message),
      honeypot: computed(() => store._values().honeypot)
    }
  })),
  withComputed((store) => {
    const validationResult = computed(() =>
      validateContactForm({
        name: store.values.name(),
        email: store.values.email(),
        message: store.values.message()
      })
    );
    const rawErrors = computed<ContactFieldErrors>(() => validationResult().errors);
    const visibleErrors = computed<ContactFieldErrors>(() => {
      const allErrors = rawErrors();
      const touchedState = store.touched();
      const attempted = store.submittedAttempted();
      const visible: ContactFieldErrors = {};

      for (const field of CONTACT_FIELD_ORDER) {
        const code = allErrors[field];
        if (code !== undefined && (touchedState[field] || attempted)) {
          visible[field] = code;
        }
      }

      return visible;
    });
    const isValid = computed(() => validationResult().valid);
    const firstInvalidField = computed<ContactFieldName | null>(
      () => validationResult().firstInvalidField
    );

    return {
      validationResult,
      rawErrors,
      visibleErrors,
      isValid,
      firstInvalidField
    };
  }),
  withMethods((store) => ({
    setSections(sections: readonly CmsPage[]): void {
      patchState(store, { sections });
    },
    setLoading(isLoading: boolean): void {
      patchState(store, { isLoading });
    },
    updateField(field: ContactFieldName, value: string): void {
      patchState(store, (state) => {
        const nextValues = { ...state._values, [field]: value };
        if (state.submitStatus !== 'idle') {
          return {
            _values: nextValues,
            ...createIdleSubmissionState()
          };
        }
        return { _values: nextValues };
      });
    },
    updateHoneypot(honeypot: string): void {
      patchState(store, (state) => ({
        _values: { ...state._values, honeypot }
      }));
    },
    blurField(field: ContactFieldName): void {
      if (store.touched()[field]) {
        return;
      }
      patchState(store, (state) => ({
        touched: { ...state.touched, [field]: true }
      }));
    },
    validateForm(): boolean {
      patchState(store, { submittedAttempted: true });
      return store.isValid();
    },
    prepareSubmit(): void {
      patchState(store, createIdleSubmissionState());
    },
    startSubmitting(): void {
      patchState(store, { isSubmitting: true });
    },
    cancelSubmitting(): void {
      patchState(store, {
        isSubmitting: false,
        ...createIdleSubmissionState()
      });
    },
    markSucceeded(): void {
      patchState(store, {
        ...createInitialContactFormState(),
        submitStatus: 'success'
      });
    },
    markFailed(code: ContactSubmissionErrorCode): void {
      patchState(store, {
        isSubmitting: false,
        submitStatus: 'error',
        submissionErrorCode: code,
        errorMessage: CONTACT_SUBMISSION_ERROR_KEYS[code]
      });
    },
    resetSubmission(): void {
      patchState(store, createIdleSubmissionState());
    },
    resetForm(): void {
      patchState(store, createInitialContactFormState());
    }
  }))
);
