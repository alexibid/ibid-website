import type {
  ContactFieldErrorCode,
  ContactFieldErrors,
  ContactFieldName,
  ContactFormValues,
  ContactValidationResult
} from '../models/contact.model';

export const CONTACT_CONSTRAINTS = {
  name: { min: 2, max: 100 },
  email: { min: 5, max: 254, localMax: 64 },
  message: { min: 10, max: 2000 }
} as const;

export const CONTACT_FIELD_ORDER: readonly ContactFieldName[] = ['name', 'email', 'message'];

const LOCAL_PART_PATTERN = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/;
const DOMAIN_LABEL_PATTERN = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
const TLD_LABEL_PATTERN = /^(?:[a-zA-Z]{2,63}|xn--[a-zA-Z0-9-]{2,59})$/;

export function normalizeSingleLine(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

export function normalizeMultiline(raw: string): string {
  return raw.replace(/\r\n?/g, '\n').trim();
}

function hasInvalidDotPlacement(value: string): boolean {
  return value.startsWith('.') || value.endsWith('.') || value.includes('..');
}

export function isValidContactEmail(normalizedEmail: string): boolean {
  if (
    normalizedEmail.length < CONTACT_CONSTRAINTS.email.min ||
    normalizedEmail.length > CONTACT_CONSTRAINTS.email.max ||
    /\s/.test(normalizedEmail)
  ) {
    return false;
  }

  const atIndex = normalizedEmail.indexOf('@');
  if (atIndex <= 0 || atIndex !== normalizedEmail.lastIndexOf('@')) {
    return false;
  }

  const localPart = normalizedEmail.slice(0, atIndex);
  const domainPart = normalizedEmail.slice(atIndex + 1);

  if (
    localPart.length < 1 ||
    localPart.length > CONTACT_CONSTRAINTS.email.localMax ||
    hasInvalidDotPlacement(localPart) ||
    !LOCAL_PART_PATTERN.test(localPart)
  ) {
    return false;
  }

  if (domainPart.length < 3 || hasInvalidDotPlacement(domainPart)) {
    return false;
  }

  const labels = domainPart.split('.');
  if (labels.length < 2 || !labels.every((label) => DOMAIN_LABEL_PATTERN.test(label))) {
    return false;
  }

  const tld = labels[labels.length - 1];
  return TLD_LABEL_PATTERN.test(tld);
}

export function validateContactField(
  field: ContactFieldName,
  rawValue: string
): ContactFieldErrorCode | undefined {
  const normalized = field === 'message' ? normalizeMultiline(rawValue) : normalizeSingleLine(rawValue);
  if (normalized.length === 0) {
    return 'required';
  }

  const { min, max } = CONTACT_CONSTRAINTS[field];
  if (normalized.length < min) {
    return 'tooShort';
  }
  if (normalized.length > max) {
    return 'tooLong';
  }
  if (field === 'email' && !isValidContactEmail(normalized)) {
    return 'invalid';
  }

  return undefined;
}

export function validateContactForm(values: ContactFormValues): ContactValidationResult {
  const errors: ContactFieldErrors = {};
  let firstInvalidField: ContactFieldName | null = null;

  for (const field of CONTACT_FIELD_ORDER) {
    const error = validateContactField(field, values[field]);
    if (error !== undefined) {
      errors[field] = error;
      if (firstInvalidField === null) {
        firstInvalidField = field;
      }
    }
  }

  return {
    valid: firstInvalidField === null,
    errors,
    firstInvalidField
  };
}
