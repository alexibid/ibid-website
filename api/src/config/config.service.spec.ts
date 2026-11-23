import { CONFIG_MOCK_ENVS } from '../mocks/static-export-fixtures.mock';
import { ConfigService } from './config.service';

describe('ConfigService', () => {
  it('should default serverHost to 127.0.0.1 and serverPort to 4510 for local-only binding', () => {
    const config = new ConfigService(CONFIG_MOCK_ENVS.empty);

    expect(config.serverHost).toBe('127.0.0.1');
    expect(config.serverPort).toBe(4510);
  });

  it('should default CORS origins exclusively to localhost and 127.0.0.1', () => {
    const config = new ConfigService(CONFIG_MOCK_ENVS.empty);

    expect(config.corsOrigins.length).toBeGreaterThan(0);
    for (const origin of config.corsOrigins) {
      const parsed = new URL(origin);
      expect(['localhost', '127.0.0.1']).toContain(parsed.hostname);
    }
  });

  it('should parse custom localhost CORS origins cleanly', () => {
    const config = new ConfigService(CONFIG_MOCK_ENVS.customLocalCors);

    expect(config.corsOrigins).toEqual(['http://localhost:4200', 'http://127.0.0.1:4201']);
  });

  it('should reject non-localhost CORS origins so requests from external origins are blocked', () => {
    expect(() => new ConfigService(CONFIG_MOCK_ENVS.externalCors)).toThrow();
  });

  it('should reject invalid or negative port configuration values', () => {
    expect(() => new ConfigService(CONFIG_MOCK_ENVS.invalidPort)).toThrow();
  });
});
