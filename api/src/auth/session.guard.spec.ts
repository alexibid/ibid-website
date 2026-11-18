import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { SessionGuard } from './session.guard.js';
import { SESSION_TTL_MS, createSessionToken } from './session-token.js';
import { MOCK_NOW, MOCK_SESSION_SECRET } from './auth.mock.js';
import { MOCK_READ_ROUTES, MOCK_WRITE_ROUTES, mockRequest } from './session.guard.mock.js';

const guard = new SessionGuard({ sessionSecret: MOCK_SESSION_SECRET }, { now: () => MOCK_NOW });
const validCookie = `ibid_session=${createSessionToken(MOCK_SESSION_SECRET, MOCK_NOW)}`;

describe('SessionGuard', () => {
  it.each(MOCK_WRITE_ROUTES)('should prove a change without login is rejected and changes nothing: %s %s', (method, url) => {
    const request = mockRequest(method, url);

    expect(() => guard.isAllowed(request)).toThrow(UnauthorizedException);
  });

  it.each(MOCK_WRITE_ROUTES)('should allow a change with a valid login: %s %s', (method, url) => {
    const request = mockRequest(method, url, validCookie);

    expect(guard.isAllowed(request)).toBe(true);
  });

  it.each(MOCK_READ_ROUTES)('should allow reading without login: %s %s', (method, url) => {
    expect(guard.isAllowed(mockRequest(method, url))).toBe(true);
  });

  it('should let the login request through without a session', () => {
    const request = mockRequest('POST', '/api/v1/auth/login');

    expect(guard.isAllowed(request)).toBe(true);
  });

  it('should refuse a change with an expired session', () => {
    const expired = `ibid_session=${createSessionToken(MOCK_SESSION_SECRET, MOCK_NOW - SESSION_TTL_MS - 1)}`;
    const request = mockRequest('PATCH', '/api/v1/pages/x', expired);

    expect(() => guard.isAllowed(request)).toThrow(UnauthorizedException);
  });

  it('should refuse a change with a forged session', () => {
    const forged = `ibid_session=${createSessionToken('not-the-secret', MOCK_NOW)}`;
    const request = mockRequest('DELETE', '/api/v1/pages/x', forged);

    expect(() => guard.isAllowed(request)).toThrow(UnauthorizedException);
  });

  it('should read the session cookie among other cookies', () => {
    const cookies = `theme=dark; ${validCookie}; lang=pt`;
    const request = mockRequest('POST', '/api/v1/pages', cookies);

    expect(guard.isAllowed(request)).toBe(true);
  });

  it('should not treat a look-alike path as the login route', () => {
    const request = mockRequest('POST', '/api/v1/auth/login-anything');

    expect(() => guard.isAllowed(request)).toThrow(UnauthorizedException);
  });
});
