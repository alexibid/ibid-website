import {
  composeContactEmail,
  stripHeaderInjection,
  validateContactFields,
} from './contact-validation.js';
import { CONTACT_VALIDATION_FIXTURES } from './mocks/contact-fixtures.mock.js';

describe('contact-validation', () => {
  it('should validate required fields, email format, and maximum field lengths', () => {
    const validResult = validateContactFields(CONTACT_VALIDATION_FIXTURES.validPaddedPayload);
    expect(validResult).toEqual({
      valid: true,
      fields: CONTACT_VALIDATION_FIXTURES.expectedNormalizedFields,
    });

    const missingResult = validateContactFields(CONTACT_VALIDATION_FIXTURES.missingFieldsPayload);
    expect(missingResult).toEqual({
      valid: false,
      error: 'name is required',
      fieldErrors: {
        name: 'required',
        email: 'required',
        message: 'tooShort',
      },
    });

    for (const invalidEmail of CONTACT_VALIDATION_FIXTURES.invalidEmails) {
      const emailResult = validateContactFields({
        ...CONTACT_VALIDATION_FIXTURES.validPaddedPayload,
        email: invalidEmail,
      });
      expect(emailResult.valid).toBe(false);
      if (!emailResult.valid) {
        expect(emailResult.fieldErrors.email).toBeDefined();
      }
    }

    const oversizedResult = validateContactFields(CONTACT_VALIDATION_FIXTURES.oversizedPayload);
    expect(oversizedResult).toEqual({
      valid: false,
      error: 'name exceeds maximum length',
      fieldErrors: {
        name: 'tooLong',
        email: 'tooLong',
        message: 'tooLong',
      },
    });
  });

  it('should strip header-injection line breaks before composing email headers', () => {
    const cleanedName = stripHeaderInjection(
      CONTACT_VALIDATION_FIXTURES.headerInjectionInput.rawName,
    );
    const cleanedUnicode = stripHeaderInjection(
      CONTACT_VALIDATION_FIXTURES.headerInjectionInput.rawHeaderWithUnicode,
    );

    expect(cleanedName).not.toMatch(/[\r\n\0\u2028\u2029]/);
    expect(cleanedUnicode).not.toMatch(/[\r\n\0\u2028\u2029]/);

    const composed = composeContactEmail(
      CONTACT_VALIDATION_FIXTURES.headerInjectionInput.fields,
      CONTACT_VALIDATION_FIXTURES.headerInjectionInput.recipientMailbox,
    );

    expect(composed.from).not.toMatch(/[\r\n\0\u2028\u2029]/);
    expect(composed.to).not.toMatch(/[\r\n\0\u2028\u2029]/);
    expect(composed.replyTo).not.toMatch(/[\r\n\0\u2028\u2029]/);
    expect(composed.subject).not.toMatch(/[\r\n\0\u2028\u2029]/);
    expect(composed.text).toContain('Line one\nLine two');
  });
});
