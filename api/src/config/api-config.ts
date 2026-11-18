export class InvalidConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidConfigError';
  }
}

export interface ApiConfig {
  readonly port: number;
  readonly databaseUrl: string;
  readonly adminPasswordHash: string;
  readonly sessionSecret: string;
  readonly contentDir: string;
  readonly publicMediaDir: string;
  readonly mediaDir: string;
}

const REQUIRED_KEYS = [
  'DATABASE_URL',
  'ADMIN_PASSWORD_HASH',
  'SESSION_SECRET',
  'CONTENT_DIR',
  'PUBLIC_MEDIA_DIR',
  'MEDIA_DIR',
  'PORT',
] as const;

export function readApiConfig(env: NodeJS.ProcessEnv): ApiConfig {
  const missing: string[] = [];
  for (const key of REQUIRED_KEYS) {
    const value = env[key];
    if (value === undefined || value.trim() === '') {
      missing.push(key);
    }
  }

  const rawPort = env.PORT?.trim() ?? '';
  const portNumber = Number(rawPort);
  const isValidPort =
    /^\d+$/.test(rawPort) &&
    Number.isInteger(portNumber) &&
    portNumber >= 1 &&
    portNumber <= 65535;

  if (rawPort !== '' && !isValidPort && !missing.includes('PORT')) {
    missing.push('PORT');
  }

  if (missing.length > 0) {
    throw new InvalidConfigError(`Invalid or missing environment variables: ${missing.join(', ')}`);
  }

  return {
    port: portNumber,
    databaseUrl: env.DATABASE_URL ? env.DATABASE_URL.trim() : '',
    adminPasswordHash: env.ADMIN_PASSWORD_HASH ? env.ADMIN_PASSWORD_HASH.trim() : '',
    sessionSecret: env.SESSION_SECRET ? env.SESSION_SECRET.trim() : '',
    contentDir: env.CONTENT_DIR ? env.CONTENT_DIR.trim() : '',
    publicMediaDir: env.PUBLIC_MEDIA_DIR ? env.PUBLIC_MEDIA_DIR.trim() : '',
    mediaDir: env.MEDIA_DIR ? env.MEDIA_DIR.trim() : '',
  };
}
