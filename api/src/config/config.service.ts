import { Inject, Injectable, Optional } from '@nestjs/common';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

export const ENV_VARS = Symbol('ENV_VARS');

export interface PostgresConfig {
  readonly host: string;
  readonly port: number;
  readonly database: string;
  readonly user: string;
  readonly password: string;
}

const DEFAULT_API_HOST = '127.0.0.1';
const DEFAULT_API_PORT = 4510;
const DEFAULT_POSTGRES_HOST = '127.0.0.1';
const DEFAULT_POSTGRES_PORT = 54330;
const DEFAULT_POSTGRES_DB = 'ibid_website';
const DEFAULT_POSTGRES_USER = 'ibid';
const DEFAULT_CORS_ORIGINS: readonly string[] = [
  'http://localhost:4200',
  'http://127.0.0.1:4200',
];
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1']);

@Injectable()
export class ConfigService {
  readonly serverHost: string;
  readonly serverPort: number;
  readonly pgConfig: PostgresConfig;
  readonly corsOrigins: readonly string[];
  readonly workspaceRoot: string;
  readonly staticPagesDir: string;
  readonly mediaDir: string;
  readonly prerenderRoutesPath: string;

  constructor(
    @Optional()
    @Inject(ENV_VARS)
    env: Record<string, string | undefined> = process.env,
  ) {
    this.serverHost = env['API_HOST']?.trim() || DEFAULT_API_HOST;
    this.serverPort = parsePort(env['API_PORT'], DEFAULT_API_PORT, 'API_PORT');
    this.pgConfig = {
      host: env['POSTGRES_HOST']?.trim() || DEFAULT_POSTGRES_HOST,
      port: parsePort(env['POSTGRES_PORT'], DEFAULT_POSTGRES_PORT, 'POSTGRES_PORT'),
      database: env['POSTGRES_DB']?.trim() || DEFAULT_POSTGRES_DB,
      user: env['POSTGRES_USER']?.trim() || DEFAULT_POSTGRES_USER,
      password: env['POSTGRES_PASSWORD'] ?? '',
    };
    this.corsOrigins = parseCorsOrigins(env['CORS_ORIGINS']);
    this.workspaceRoot = resolveWorkspaceRoot(env['WORKSPACE_ROOT']);
    this.staticPagesDir =
      env['STATIC_PAGES_DIR']?.trim() || resolve(this.workspaceRoot, 'public/pages');
    this.mediaDir =
      env['MEDIA_DIR']?.trim() || resolve(this.workspaceRoot, 'public/content-media');
    this.prerenderRoutesPath =
      env['PRERENDER_ROUTES_PATH']?.trim() ||
      resolve(this.workspaceRoot, 'src/prerender-routes.txt');
  }
}

function parsePort(raw: string | undefined, fallback: number, name: string): number {
  if (raw === undefined || raw.trim() === '') {
    return fallback;
  }
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`Invalid port value for ${name}: ${raw}`);
  }
  return parsed;
}

function parseCorsOrigins(raw: string | undefined): readonly string[] {
  if (raw === undefined || raw.trim() === '') {
    return DEFAULT_CORS_ORIGINS;
  }
  const entries = raw
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  if (entries.length === 0) {
    throw new Error('CORS_ORIGINS must contain at least one local origin');
  }
  return entries.map((origin) => validateLocalOrigin(origin));
}

function validateLocalOrigin(origin: string): string {
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    throw new Error(`Invalid CORS origin URL: ${origin}`);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Unsupported CORS origin protocol: ${origin}`);
  }
  if (!LOCAL_HOSTNAMES.has(parsed.hostname)) {
    throw new Error(`CORS origin must use localhost or 127.0.0.1: ${origin}`);
  }
  return parsed.origin;
}

function resolveWorkspaceRoot(configured: string | undefined): string {
  if (configured !== undefined && configured.trim() !== '') {
    return configured.trim();
  }
  const cwd = process.cwd();
  const fromApiDir = resolve(cwd, '..');
  if (
    existsSync(resolve(fromApiDir, 'src/prerender-routes.txt')) ||
    existsSync(resolve(fromApiDir, 'project.json'))
  ) {
    return fromApiDir;
  }
  const fromWorkspaceRoot = join(cwd, 'apps/ibid-website');
  if (existsSync(join(fromWorkspaceRoot, 'project.json'))) {
    return fromWorkspaceRoot;
  }
  if (existsSync(join(cwd, 'public'))) {
    return cwd;
  }
  return fromApiDir;
}
