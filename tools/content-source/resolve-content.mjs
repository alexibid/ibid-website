import { cp, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const APP_ROOT = resolve(import.meta.dirname, '../..');
const REAL_MANIFEST = join(APP_ROOT, 'public/pages/routes.json');
const REAL_ROUTES = join(APP_ROOT, 'src/prerender-routes.txt');
const MOCK_ROOT = join(APP_ROOT, 'src/mocks/content');
const RESOLVED_ROOT = join(APP_ROOT, 'tmp/content');

async function useRealContent() {
  await cp(REAL_ROUTES, join(RESOLVED_ROOT, 'prerender-routes.txt'));
  console.log('ibid-website content: real (public/pages)');
}

async function useMockContent() {
  await cp(join(MOCK_ROOT, 'prerender-routes.txt'), join(RESOLVED_ROOT, 'prerender-routes.txt'));
  await cp(join(MOCK_ROOT, 'public'), join(RESOLVED_ROOT, 'public'), { recursive: true });
  console.warn('ibid-website content: mocks (public/pages is absent); this bundle must never be deployed');
}

async function main() {
  await rm(RESOLVED_ROOT, { recursive: true, force: true });
  await mkdir(RESOLVED_ROOT, { recursive: true });
  await (existsSync(REAL_MANIFEST) ? useRealContent() : useMockContent());
}

await main();
