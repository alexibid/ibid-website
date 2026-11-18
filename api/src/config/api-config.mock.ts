// secretlint-disable
export const MOCK_COMPLETE_ENV = {
  DATABASE_URL: 'postgres://mock-user:mock-db-secret@ibid-website-db:5432/ibid_website',
  ADMIN_PASSWORD_HASH: 'scrypt$bW9jay1zYWx0$bW9jay1oYXNo',
  SESSION_SECRET: 'mock-session-secret-value',
  CONTENT_DIR: '/data/content',
  PUBLIC_MEDIA_DIR: '/data/content-media',
  MEDIA_DIR: '/data/media',
  PORT: '4510',
} as const;

export const MOCK_SECRET_VALUES: readonly string[] = [
  MOCK_COMPLETE_ENV.DATABASE_URL,
  MOCK_COMPLETE_ENV.ADMIN_PASSWORD_HASH,
  MOCK_COMPLETE_ENV.SESSION_SECRET,
];

export const MOCK_BAD_PORTS: readonly string[] = ['', 'abc', '0', '70000', '45.10'];
