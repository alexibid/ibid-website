import { classifyContactHttpError } from './contact-http-error.mapper';
import { CONTACT_HTTP_FIXTURES } from '../../../mocks/contact-form.mock';

describe('classifyContactHttpError', () => {
  it('should classify offline state before inspecting any HTTP, timeout, or unknown error', () => {
    const { mapperCases } = CONTACT_HTTP_FIXTURES;

    expect(classifyContactHttpError(mapperCases.serverError500, false)).toBe('offline');
    expect(classifyContactHttpError(mapperCases.rxjsTimeoutError, false)).toBe('offline');
    expect(classifyContactHttpError(mapperCases.genericError, false)).toBe('offline');
  });

  it('should classify timeout errors, HTTP status codes (0, 400, 403, 429, 5xx), and unknown errors when online', () => {
    const { mapperCases } = CONTACT_HTTP_FIXTURES;

    expect(classifyContactHttpError(mapperCases.rxjsTimeoutError, true)).toBe('timeout');
    expect(classifyContactHttpError(mapperCases.namedTimeoutError, true)).toBe('timeout');
    expect(classifyContactHttpError(mapperCases.networkError, true)).toBe('network');
    expect(classifyContactHttpError(mapperCases.validationError, true)).toBe('validation');
    expect(classifyContactHttpError(mapperCases.verificationError, true)).toBe('verification');
    expect(classifyContactHttpError(mapperCases.rateLimitError, true)).toBe('rateLimit');
    expect(classifyContactHttpError(mapperCases.serverError500, true)).toBe('server');
    expect(classifyContactHttpError(mapperCases.serverError503, true)).toBe('server');
    expect(classifyContactHttpError(mapperCases.genericError, true)).toBe('unknown');
    expect(classifyContactHttpError(mapperCases.nonErrorValue, true)).toBe('unknown');
  });
});
