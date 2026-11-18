import { describe, expect, it } from 'vitest';
import { InvalidConfigError, readApiConfig } from './api-config.js';
import { MOCK_BAD_PORTS, MOCK_COMPLETE_ENV, MOCK_SECRET_VALUES } from './api-config.mock.js';

function messageOf(env: NodeJS.ProcessEnv): string {
  try {
    readApiConfig(env);
  } catch (error) {
    expect(error).toBeInstanceOf(InvalidConfigError);
    return error instanceof Error ? error.message : String(error);
  }
  throw new Error('readApiConfig accepted an incomplete environment');
}


describe('readApiConfig', () => {
  it('should read a complete environment', () => {
    const config = readApiConfig(MOCK_COMPLETE_ENV);

    expect(config.port).toBe(4510);
    expect(config.contentDir).toBe('/data/content');
  });

  it('should name every missing secret without printing any secret value', () => {
    const { ADMIN_PASSWORD_HASH: _hash, SESSION_SECRET: _secret, ...partial } = MOCK_COMPLETE_ENV;

    const message = messageOf(partial);

    expect(message).toContain('ADMIN_PASSWORD_HASH');
    expect(message).toContain('SESSION_SECRET');
    for (const secret of MOCK_SECRET_VALUES) expect(message).not.toContain(secret);
  });

  it('should refuse an empty environment, naming all of it', () => {
    const message = messageOf({});

    for (const name of Object.keys(MOCK_COMPLETE_ENV)) expect(message).toContain(name);
  });

  it('should treat blank values as missing', () => {
    expect(messageOf({ ...MOCK_COMPLETE_ENV, SESSION_SECRET: '   ' })).toContain('SESSION_SECRET');
  });

  it.each(MOCK_BAD_PORTS)('should refuse the port %j', (port) => {
    expect(messageOf({ ...MOCK_COMPLETE_ENV, PORT: port })).toContain('PORT');
  });
});
