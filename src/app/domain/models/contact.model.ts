export type ContactFieldName = 'name' | 'email' | 'message';

export type ContactFieldErrorCode = 'required' | 'tooShort' | 'tooLong' | 'invalid';

export type ContactFieldErrors = Partial<Record<ContactFieldName, ContactFieldErrorCode>>;

export type ContactSubmissionErrorCode =
  | 'offline'
  | 'network'
  | 'timeout'
  | 'validation'
  | 'verification'
  | 'rateLimit'
  | 'server'
  | 'unknown';

export type ContactSubmitStatus = 'idle' | 'success' | 'error';

export interface ContactFormValues {
  readonly name: string;
  readonly email: string;
  readonly message: string;
}

export type ContactTouchedState = Record<ContactFieldName, boolean>;

export interface ContactValidationResult {
  readonly valid: boolean;
  readonly errors: ContactFieldErrors;
  readonly firstInvalidField: ContactFieldName | null;
}

export interface ContactSubmissionPayload {
  readonly name: string;
  readonly email: string;
  readonly message: string;
  readonly honeypot: string;
  readonly recaptchaToken: string;
}

export interface ContactApiResponse {
  readonly success?: boolean;
  readonly message?: string;
}
