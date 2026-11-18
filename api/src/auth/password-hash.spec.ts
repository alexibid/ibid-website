import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password-hash.js';
import { MOCK_MALFORMED_HASHES, MOCK_PASSWORDS } from './auth.mock.js';


describe('password hash', () => {
  it('should accept the right password against its own hash', async () => {
    const stored = await hashPassword(MOCK_PASSWORDS.right);

    await expect(verifyPassword(MOCK_PASSWORDS.right, stored)).resolves.toBe(true);
  });

  it('should refuse a wrong password', async () => {
    const stored = await hashPassword(MOCK_PASSWORDS.right);

    await expect(verifyPassword(MOCK_PASSWORDS.wrong, stored)).resolves.toBe(false);
  });

  it('should refuse an empty password against a real hash', async () => {
    const stored = await hashPassword(MOCK_PASSWORDS.right);

    await expect(verifyPassword(MOCK_PASSWORDS.empty, stored)).resolves.toBe(false);
  });

  it('should never store the password itself', async () => {
    const stored = await hashPassword(MOCK_PASSWORDS.right);

    expect(stored).not.toContain(MOCK_PASSWORDS.right);
    expect(stored.startsWith('scrypt$')).toBe(true);
  });

  it('should give a different hash each time for the same password', async () => {
    const first = await hashPassword(MOCK_PASSWORDS.right);
    const second = await hashPassword(MOCK_PASSWORDS.right);

    expect(first).not.toBe(second);
  });

  it('should handle very long and unicode passwords', async () => {
    const longHash = await hashPassword(MOCK_PASSWORDS.long);
    const unicodeHash = await hashPassword(MOCK_PASSWORDS.unicode);

    await expect(verifyPassword(MOCK_PASSWORDS.long, longHash)).resolves.toBe(true);
    await expect(verifyPassword(MOCK_PASSWORDS.unicode, unicodeHash)).resolves.toBe(true);
  });

  it.each(MOCK_MALFORMED_HASHES)('should refuse any password when the stored hash is %j', async (stored) => {
    await expect(verifyPassword(MOCK_PASSWORDS.right, stored)).resolves.toBe(false);
  });
});
