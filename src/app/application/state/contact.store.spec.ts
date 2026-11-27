import { TestBed } from '@angular/core/testing';
import { ContactStore } from './contact.store';
import {
  CONTACT_I18N_FIXTURES,
  CONTACT_LAYOUT_FIXTURES,
  CONTACT_VALIDATION_FIXTURES
} from '../../../mocks/contact-form.mock';
import { CONTACT_FORM_FIXTURES } from '../../../mocks/static-html.mock';

describe('ContactStore', () => {
  let store: InstanceType<typeof ContactStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(ContactStore);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('should initialize with empty form values, idle submission state, and hidden validation errors', () => {
    expect(store.sections()).toEqual([]);
    expect(store.isLoading()).toBe(false);
    expect(store.values.name()).toBe('');
    expect(store.values.email()).toBe('');
    expect(store.values.message()).toBe('');
    expect(store.values.honeypot()).toBe('');
    expect(store.touched()).toEqual({ name: false, email: false, message: false });
    expect(store.submittedAttempted()).toBe(false);
    expect(store.isSubmitting()).toBe(false);
    expect(store.submitStatus()).toBe('idle');
    expect(store.submissionErrorCode()).toBeNull();
    expect(store.errorMessage()).toBe('');
    expect(store.visibleErrors()).toEqual({});
    expect(store.isValid()).toBe(false);
    expect(store.firstInvalidField()).toBe('name');
  });

  it('should update field and honeypot values, track blur, and clear visible errors on edit', () => {
    store.updateField('name', CONTACT_VALIDATION_FIXTURES.formCases.allInvalid.name);
    store.updateField('email', CONTACT_FORM_FIXTURES.invalidEmail);
    store.updateField('message', CONTACT_VALIDATION_FIXTURES.formCases.allInvalid.message);
    store.updateHoneypot(CONTACT_FORM_FIXTURES.honeypotValue);

    expect(store.values.honeypot()).toBe(CONTACT_FORM_FIXTURES.honeypotValue);
    expect(store.visibleErrors()).toEqual({});

    store.blurField('email');
    expect(store.touched()).toEqual({ name: false, email: true, message: false });
    expect(store.visibleErrors()).toEqual({ email: 'invalid' });

    store.blurField('email');
    expect(store.touched()).toEqual({ name: false, email: true, message: false });

    store.updateField('email', CONTACT_FORM_FIXTURES.validEmail);
    expect(store.values.email()).toBe(CONTACT_FORM_FIXTURES.validEmail);
    expect(store.visibleErrors()).toEqual({});

    expect(store.validateForm()).toBe(false);
    expect(store.submittedAttempted()).toBe(true);
    expect(store.visibleErrors()).toEqual({ name: 'required', message: 'tooShort' });

    store.updateField('name', CONTACT_FORM_FIXTURES.validName);
    store.updateField('message', CONTACT_FORM_FIXTURES.validMessage);
    expect(store.visibleErrors()).toEqual({});
    expect(store.isValid()).toBe(true);
    expect(store.firstInvalidField()).toBeNull();
  });

  it('should manage submission state transitions for start, failure, reset, and success', () => {
    store.updateField('name', CONTACT_FORM_FIXTURES.validName);
    store.updateField('email', CONTACT_FORM_FIXTURES.validEmail);
    store.updateField('message', CONTACT_FORM_FIXTURES.validMessage);
    expect(store.validateForm()).toBe(true);

    store.startSubmitting();
    expect(store.isSubmitting()).toBe(true);

    store.markFailed('network');
    expect(store.isSubmitting()).toBe(false);
    expect(store.submitStatus()).toBe('error');
    expect(store.submissionErrorCode()).toBe('network');
    expect(store.errorMessage()).toBe(CONTACT_I18N_FIXTURES.expectedSubmissionErrorKeys.network);

    store.prepareSubmit();
    expect(store.submitStatus()).toBe('idle');
    expect(store.submissionErrorCode()).toBeNull();
    expect(store.errorMessage()).toBe('');

    store.markFailed('offline');
    store.resetSubmission();
    expect(store.submitStatus()).toBe('idle');
    expect(store.submissionErrorCode()).toBeNull();
    expect(store.errorMessage()).toBe('');

    store.startSubmitting();
    store.markSucceeded();
    expect(store.isSubmitting()).toBe(false);
    expect(store.submitStatus()).toBe('success');
    expect(store.values.name()).toBe('');
    expect(store.values.email()).toBe('');
    expect(store.values.message()).toBe('');
    expect(store.values.honeypot()).toBe('');
    expect(store.touched()).toEqual({ name: false, email: false, message: false });
    expect(store.submittedAttempted()).toBe(false);
  });

  it('should reset form fields and errors while preserving sections and isLoading', () => {
    store.setSections(CONTACT_LAYOUT_FIXTURES.fullExitSections);
    store.setLoading(true);
    store.updateField('name', CONTACT_FORM_FIXTURES.validName);
    store.updateField('email', CONTACT_FORM_FIXTURES.invalidEmail);
    store.updateHoneypot(CONTACT_FORM_FIXTURES.honeypotValue);
    store.blurField('email');
    store.validateForm();
    store.markFailed('server');

    store.resetForm();

    expect(store.sections()).toEqual(CONTACT_LAYOUT_FIXTURES.fullExitSections);
    expect(store.isLoading()).toBe(true);
    expect(store.values.name()).toBe('');
    expect(store.values.email()).toBe('');
    expect(store.values.message()).toBe('');
    expect(store.values.honeypot()).toBe('');
    expect(store.touched()).toEqual({ name: false, email: false, message: false });
    expect(store.submittedAttempted()).toBe(false);
    expect(store.isSubmitting()).toBe(false);
    expect(store.submitStatus()).toBe('idle');
    expect(store.submissionErrorCode()).toBeNull();
    expect(store.errorMessage()).toBe('');
    expect(store.visibleErrors()).toEqual({});
  });

  it('should cancel submitting and clear busy state while preserving typed form values and sections', () => {
    store.setSections(CONTACT_LAYOUT_FIXTURES.fullExitSections);
    store.updateField('name', CONTACT_FORM_FIXTURES.validName);
    store.updateField('email', CONTACT_FORM_FIXTURES.validEmail);
    store.updateField('message', CONTACT_FORM_FIXTURES.validMessage);
    store.blurField('name');
    store.validateForm();
    store.markFailed('server');
    store.startSubmitting();
    expect(store.isSubmitting()).toBe(true);

    store.cancelSubmitting();

    expect(store.isSubmitting()).toBe(false);
    expect(store.submitStatus()).toBe('idle');
    expect(store.submissionErrorCode()).toBeNull();
    expect(store.errorMessage()).toBe('');
    expect(store.values.name()).toBe(CONTACT_FORM_FIXTURES.validName);
    expect(store.values.email()).toBe(CONTACT_FORM_FIXTURES.validEmail);
    expect(store.values.message()).toBe(CONTACT_FORM_FIXTURES.validMessage);
    expect(store.touched()).toEqual({ name: true, email: false, message: false });
    expect(store.submittedAttempted()).toBe(true);
    expect(store.sections()).toEqual(CONTACT_LAYOUT_FIXTURES.fullExitSections);
  });

  it('should clear stale submission status on field edit while preserving field values', () => {
    store.updateField('name', CONTACT_FORM_FIXTURES.validName);
    store.updateField('email', CONTACT_FORM_FIXTURES.validEmail);
    store.updateField('message', CONTACT_FORM_FIXTURES.validMessage);
    store.updateHoneypot(CONTACT_FORM_FIXTURES.honeypotValue);
    store.markFailed('network');

    expect(store.submitStatus()).toBe('error');
    expect(store.submissionErrorCode()).toBe('network');
    expect(store.errorMessage()).toBe(CONTACT_I18N_FIXTURES.expectedSubmissionErrorKeys.network);

    store.updateField('message', CONTACT_FORM_FIXTURES.editedMessage);

    expect(store.submitStatus()).toBe('idle');
    expect(store.submissionErrorCode()).toBeNull();
    expect(store.errorMessage()).toBe('');
    expect(store.values.name()).toBe(CONTACT_FORM_FIXTURES.validName);
    expect(store.values.email()).toBe(CONTACT_FORM_FIXTURES.validEmail);
    expect(store.values.message()).toBe(CONTACT_FORM_FIXTURES.editedMessage);
    expect(store.values.honeypot()).toBe(CONTACT_FORM_FIXTURES.honeypotValue);

    store.markSucceeded();
    expect(store.submitStatus()).toBe('success');

    store.updateField('name', CONTACT_FORM_FIXTURES.editedName);

    expect(store.submitStatus()).toBe('idle');
    expect(store.submissionErrorCode()).toBeNull();
    expect(store.errorMessage()).toBe('');
    expect(store.values.name()).toBe(CONTACT_FORM_FIXTURES.editedName);
  });
});
