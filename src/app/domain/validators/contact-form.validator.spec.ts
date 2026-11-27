import {
  CONTACT_CONSTRAINTS,
  CONTACT_FIELD_ORDER,
  isValidContactEmail,
  normalizeMultiline,
  normalizeSingleLine,
  validateContactField,
  validateContactForm
} from './contact-form.validator';
import { CONTACT_VALIDATION_FIXTURES } from '../../../mocks/contact-form.mock';

describe('contact-form.validator', () => {
  it('should reject empty or whitespace-only values and enforce boundary lengths for name, email, and message', () => {
    for (const field of CONTACT_FIELD_ORDER) {
      for (const blank of CONTACT_VALIDATION_FIXTURES.whitespaceInputs) {
        expect(validateContactField(field, blank)).toBe('required');
      }
    }

    const { nameBoundaries, emailBoundaries, messageBoundaries } = CONTACT_VALIDATION_FIXTURES;

    expect(validateContactField('name', nameBoundaries.tooShort)).toBe('tooShort');
    expect(validateContactField('name', nameBoundaries.tooShortPadded)).toBe('tooShort');
    expect(validateContactField('name', nameBoundaries.minValid)).toBeUndefined();
    expect(validateContactField('name', nameBoundaries.minValidPadded)).toBeUndefined();
    expect(validateContactField('name', nameBoundaries.maxValid)).toBeUndefined();
    expect(validateContactField('name', nameBoundaries.tooLong)).toBe('tooLong');
    expect(nameBoundaries.maxValid.length).toBe(CONTACT_CONSTRAINTS.name.max);

    expect(validateContactField('email', emailBoundaries.tooShort)).toBe('tooShort');
    expect(validateContactField('email', emailBoundaries.minLengthMalformed)).toBe('invalid');
    expect(validateContactField('email', emailBoundaries.minValid)).toBeUndefined();
    expect(validateContactField('email', emailBoundaries.maxValid)).toBeUndefined();
    expect(validateContactField('email', emailBoundaries.tooLong)).toBe('tooLong');
    expect(emailBoundaries.maxValid.length).toBe(CONTACT_CONSTRAINTS.email.max);

    expect(validateContactField('message', messageBoundaries.tooShort)).toBe('tooShort');
    expect(validateContactField('message', messageBoundaries.tooShortCrlf)).toBe('tooShort');
    expect(validateContactField('message', messageBoundaries.minValid)).toBeUndefined();
    expect(validateContactField('message', messageBoundaries.minValidPadded)).toBeUndefined();
    expect(validateContactField('message', messageBoundaries.maxValid)).toBeUndefined();
    expect(validateContactField('message', messageBoundaries.tooLong)).toBe('tooLong');
    expect(messageBoundaries.maxValid.length).toBe(CONTACT_CONSTRAINTS.message.max);
  });

  it('should accept valid emails and reject malformed email addresses', () => {
    for (const validEmail of CONTACT_VALIDATION_FIXTURES.validEmails) {
      expect(isValidContactEmail(validEmail)).toBe(true);
      expect(validateContactField('email', validEmail)).toBeUndefined();
    }

    expect(validateContactField('email', CONTACT_VALIDATION_FIXTURES.paddedValidEmail)).toBeUndefined();

    for (const invalidEmail of CONTACT_VALIDATION_FIXTURES.invalidEmails) {
      expect(isValidContactEmail(invalidEmail)).toBe(false);
    }
  });

  it('should validate the full form in field order and identify the first invalid field', () => {
    const { formCases } = CONTACT_VALIDATION_FIXTURES;

    expect(validateContactForm(formCases.allInvalid)).toEqual({
      valid: false,
      errors: { name: 'required', email: 'tooShort', message: 'tooShort' },
      firstInvalidField: 'name'
    });

    expect(validateContactForm(formCases.emailFirstInvalid)).toEqual({
      valid: false,
      errors: { email: 'tooShort', message: 'tooShort' },
      firstInvalidField: 'email'
    });

    expect(validateContactForm(formCases.messageFirstInvalid)).toEqual({
      valid: false,
      errors: { message: 'tooShort' },
      firstInvalidField: 'message'
    });

    expect(validateContactForm(formCases.allValidPadded)).toEqual({
      valid: true,
      errors: {},
      firstInvalidField: null
    });

    expect(normalizeSingleLine(formCases.allValidPadded.name)).toBe(
      formCases.normalizedPayload.name
    );
    expect(normalizeMultiline(formCases.allValidPadded.message)).toBe(
      formCases.normalizedPayload.message
    );
  });
});
