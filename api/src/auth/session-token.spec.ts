import { describe, expect, it } from 'vitest';
import { SESSION_TTL_MS, createSessionToken, isValidSessionToken } from './session-token.js';
import { MOCK_NOW, MOCK_SESSION_SECRET } from './auth.mock.js';


describe('session token', () => {
  it('should accept a token it created, before it expires', () => {
    const token = createSessionToken(MOCK_SESSION_SECRET, MOCK_NOW);

    expect(isValidSessionToken(token, MOCK_SESSION_SECRET, MOCK_NOW + 1000)).toBe(true);
  });

  it('should refuse a token once it has expired', () => {
    const token = createSessionToken(MOCK_SESSION_SECRET, MOCK_NOW);

    expect(isValidSessionToken(token, MOCK_SESSION_SECRET, MOCK_NOW + SESSION_TTL_MS + 1)).toBe(false);
  });

  it('should refuse a token signed with another secret', () => {
    const token = createSessionToken('another-secret', MOCK_NOW);

    expect(isValidSessionToken(token, MOCK_SESSION_SECRET, MOCK_NOW)).toBe(false);
  });

  it('should refuse a token whose expiry was changed', () => {
    const token = createSessionToken(MOCK_SESSION_SECRET, MOCK_NOW);
    const [, signature] = token.split('.');
    const tampered = `${MOCK_NOW + SESSION_TTL_MS * 10}.${signature}`;

    expect(isValidSessionToken(tampered, MOCK_SESSION_SECRET, MOCK_NOW)).toBe(false);
  });

  it.each(['', '.', 'abc', '123.', '.abc', 'not.a.token'])('should refuse the malformed token %j', (token) => {
    expect(isValidSessionToken(token, MOCK_SESSION_SECRET, MOCK_NOW)).toBe(false);
  });
});
