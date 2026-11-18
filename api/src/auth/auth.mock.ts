export const MOCK_NOW = Date.UTC(2026, 10, 18, 12, 0, 0);

export const MOCK_SESSION_SECRET = 'mock-session-secret-for-unit-tests-only';

export const MOCK_PASSWORDS = {
  right: 'correct horse battery staple',
  wrong: 'Tr0ub4dor&3',
  empty: '',
  long: 'p'.repeat(4096),
  unicode: 'pãssw0rd-çé-🔐',
} as const;

export const MOCK_MALFORMED_HASHES: readonly string[] = [
  '',
  'scrypt',
  'scrypt$onlysalt',
  'bcrypt$c2FsdA==$aGFzaA==',
  'scrypt$c2FsdA==$aGFzaA==$extra',
  'plain-text-password',
];

export const MOCK_LOGIN_BODIES = {
  missing: {},
  notAnObject: 'password',
  wrongType: { password: 123 },
  extraField: { password: 'x', admin: true },
} as const;
