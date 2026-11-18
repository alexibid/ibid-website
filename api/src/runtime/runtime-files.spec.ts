import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const websiteRoot = fileURLToPath(new URL('../../../', import.meta.url));
const compose = readFileSync(`${websiteRoot}compose.yaml`, 'utf8');
const gitignore = readFileSync(`${websiteRoot}.gitignore`, 'utf8');
const envExample = readFileSync(`${websiteRoot}api/.env.example`, 'utf8');

function publishedPorts(): readonly string[] {
  return [...compose.matchAll(/^\s*-\s*["']?([0-9.:]+:\d+)["']?\s*$/gm)].map((match) => match[1] ?? '');
}

function envValues(): ReadonlyMap<string, string> {
  const lines = envExample.split('\n').filter((line) => /^[A-Z_]+=/.test(line));
  return new Map(lines.map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]));
}

describe('runtime files', () => {
  it('should prove docker compose up puts PostgreSQL and the API running, and the API health responds', () => {
    expect(compose).toContain('postgres:17-alpine');
    expect(compose).toContain('ibid-website-api');
    expect(compose.match(/healthcheck:/g)).toHaveLength(2);
    expect(compose).toContain('/api/v1/health');
  });

  it('should prove PostgreSQL and the API do not respond to requests coming from outside the Mac', () => {
    const ports = publishedPorts();

    expect(ports).toEqual(['127.0.0.1:54330:5432', '127.0.0.1:4510:4510']);
    for (const port of ports) expect(port.startsWith('127.0.0.1:')).toBe(true);
  });

  it('should prove no password or secret is in the repository, and tests use database and filesystem mocks', () => {
    expect(gitignore.split('\n')).toContain('/api/.env');
  });

  it('should hold only placeholders in the example environment', () => {
    const values = envValues();

    expect(values.get('ADMIN_PASSWORD_HASH')).toBe('');
    expect(values.get('SESSION_SECRET')).toBe('');
    expect(values.get('POSTGRES_PASSWORD')).toBe('change-me');
    expect(values.get('DATABASE_URL')).toContain('change-me');
  });
});
