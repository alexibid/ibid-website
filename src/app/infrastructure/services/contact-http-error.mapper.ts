import { HttpErrorResponse } from '@angular/common/http';
import { TimeoutError } from 'rxjs';
import type { ContactSubmissionErrorCode } from '../../domain/models/contact.model';

const HTTP_STATUS_ERROR_CODES: ReadonlyMap<number, ContactSubmissionErrorCode> = new Map([
  [0, 'network'],
  [400, 'validation'],
  [403, 'verification'],
  [429, 'rateLimit']
]);

function isTimeoutError(error: unknown): boolean {
  return error instanceof TimeoutError || (error instanceof Error && error.name === 'TimeoutError');
}

export function classifyContactHttpError(
  error: unknown,
  isOnline: boolean
): ContactSubmissionErrorCode {
  if (!isOnline) {
    return 'offline';
  }
  if (isTimeoutError(error)) {
    return 'timeout';
  }
  if (error instanceof HttpErrorResponse) {
    return HTTP_STATUS_ERROR_CODES.get(error.status) ?? 'server';
  }
  return 'unknown';
}
