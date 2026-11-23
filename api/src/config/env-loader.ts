import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function parseEnvText(envText: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of envText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex <= 0) {
      continue;
    }
    result[trimmed.slice(0, eqIndex).trim()] = trimmed.slice(eqIndex + 1);
  }
  return result;
}

export function loadApiEnv(): void {
  const candidates = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), 'apps/ibid-website/api/.env'),
  ];
  const envPath = candidates.find((candidate) => existsSync(candidate));
  if (!envPath) {
    return;
  }
  const parsed = parseEnvText(readFileSync(envPath, 'utf8'));
  for (const [key, value] of Object.entries(parsed)) {
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}
