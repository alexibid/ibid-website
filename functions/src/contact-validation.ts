export const CONTACT_CONSTRAINTS = {
  name: { min: 2, max: 100 },
  email: { min: 5, max: 254, localMax: 64 },
  message: { min: 10, max: 2000 },
} as const;

export type ContactFieldName = 'name' | 'email' | 'message';

export type ContactFieldErrorCode = 'required' | 'tooShort' | 'tooLong' | 'invalid';

export type ContactFieldErrors = Partial<Record<ContactFieldName, ContactFieldErrorCode>>;

export interface ValidatedContactFields {
  readonly name: string;
  readonly email: string;
  readonly message: string;
}

export type ContactFieldsValidationResult =
  | { readonly valid: true; readonly fields: ValidatedContactFields }
  | {
      readonly valid: false;
      readonly error: string;
      readonly fieldErrors: ContactFieldErrors;
    };

export interface ComposedContactEmail {
  readonly from: string;
  readonly to: string;
  readonly replyTo: string;
  readonly subject: string;
  readonly text: string;
}

const LOCAL_PART_PATTERN = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/;
const DOMAIN_LABEL_PATTERN = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
const TLD_LABEL_PATTERN = /^(?:[a-zA-Z]{2,63}|xn--[a-zA-Z0-9-]{2,59})$/;
const MAX_RAW_INPUT_LENGTH = 50_000;

function isHeaderControlChar(code: number): boolean {
  return code < 0x20 || code === 0x7f || code === 0x85 || code === 0x2028 || code === 0x2029;
}

function hasRawHeaderBreak(raw: string): boolean {
  return raw.includes('\r') || raw.includes('\n') || raw.includes('\0');
}

export function stripHeaderInjection(raw: string): string {
  let cleaned = '';
  for (const char of raw) {
    cleaned += isHeaderControlChar(char.charCodeAt(0)) ? ' ' : char;
  }
  return cleaned.replace(/ {2,}/g, ' ').trim();
}

export function normalizeSingleLine(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

export function normalizeMultiline(raw: string): string {
  return raw.replace(/\r\n?/g, '\n').split('\0').join('').trim();
}

function hasInvalidDotPlacement(value: string): boolean {
  return value.startsWith('.') || value.endsWith('.') || value.includes('..');
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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

type SingleFieldCheck =
  | { readonly ok: true; readonly value: string }
  | { readonly ok: false; readonly code: ContactFieldErrorCode; readonly message: string };

function validateTextField(
  field: 'name' | 'message',
  rawValue: unknown,
): SingleFieldCheck {
  if (typeof rawValue !== 'string') {
    return { ok: false, code: 'required', message: `${field} is required` };
  }
  if (rawValue.length > MAX_RAW_INPUT_LENGTH) {
    return { ok: false, code: 'tooLong', message: `${field} exceeds maximum length` };
  }
  const normalized =
    field === 'message' ? normalizeMultiline(rawValue) : normalizeSingleLine(rawValue);
  if (normalized.length === 0) {
    return { ok: false, code: 'required', message: `${field} is required` };
  }
  const limits = CONTACT_CONSTRAINTS[field];
  if (normalized.length < limits.min) {
    return { ok: false, code: 'tooShort', message: `${field} is too short` };
  }
  if (normalized.length > limits.max) {
    return { ok: false, code: 'tooLong', message: `${field} exceeds maximum length` };
  }
  return { ok: true, value: normalized };
}

function validateEmailField(rawValue: unknown): SingleFieldCheck {
  if (typeof rawValue !== 'string') {
    return { ok: false, code: 'required', message: 'email is required' };
  }
  if (rawValue.length > MAX_RAW_INPUT_LENGTH) {
    return { ok: false, code: 'tooLong', message: 'email exceeds maximum length' };
  }
  if (hasRawHeaderBreak(rawValue)) {
    return { ok: false, code: 'invalid', message: 'Invalid email address' };
  }
  const normalized = normalizeSingleLine(rawValue);
  if (normalized.length === 0) {
    return { ok: false, code: 'required', message: 'email is required' };
  }
  if (normalized.length < CONTACT_CONSTRAINTS.email.min) {
    return { ok: false, code: 'tooShort', message: 'email is too short' };
  }
  if (normalized.length > CONTACT_CONSTRAINTS.email.max) {
    return { ok: false, code: 'tooLong', message: 'email exceeds maximum length' };
  }
  if (!isValidContactEmail(normalized)) {
    return { ok: false, code: 'invalid', message: 'Invalid email address' };
  }
  return { ok: true, value: normalized };
}

export function validateContactFields(payload: unknown): ContactFieldsValidationResult {
  if (!isPlainRecord(payload)) {
    return {
      valid: false,
      error: 'Invalid contact payload',
      fieldErrors: { name: 'required', email: 'required', message: 'required' },
    };
  }

  const nameResult = validateTextField('name', payload['name']);
  const emailResult = validateEmailField(payload['email']);
  const messageResult = validateTextField('message', payload['message']);

  const fieldErrors: ContactFieldErrors = {
    ...(!nameResult.ok ? { name: nameResult.code } : {}),
    ...(!emailResult.ok ? { email: emailResult.code } : {}),
    ...(!messageResult.ok ? { message: messageResult.code } : {}),
  };

  if (!nameResult.ok || !emailResult.ok || !messageResult.ok) {
    const firstError =
      (!nameResult.ok && nameResult.message) ||
      (!emailResult.ok && emailResult.message) ||
      (!messageResult.ok && messageResult.message) ||
      'Invalid contact fields';
    return { valid: false, error: firstError, fieldErrors };
  }

  return {
    valid: true,
    fields: {
      name: nameResult.value,
      email: emailResult.value,
      message: messageResult.value,
    },
  };
}

export function composeContactEmail(
  fields: ValidatedContactFields,
  recipientMailbox: string,
): ComposedContactEmail {
  const safeMailbox = stripHeaderInjection(recipientMailbox);
  if (!safeMailbox) {
    throw new Error('Destination mailbox is not configured');
  }

  const safeName = stripHeaderInjection(fields.name);
  const safeEmail = stripHeaderInjection(fields.email);
  const safeMessage = normalizeMultiline(fields.message);

  return {
    from: safeMailbox,
    to: safeMailbox,
    replyTo: safeEmail,
    subject: `Contact message from ${safeName}`,
    text: `Name: ${safeName}\nEmail: ${safeEmail}\n\nMessage:\n${safeMessage}`,
  };
}
