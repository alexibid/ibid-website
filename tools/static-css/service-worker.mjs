import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { runServiceWorker } from './service-worker.runtime.mjs';

export const SERVICE_WORKER_FILE = 'service-worker.js';

function initialScriptsOf(html) {
  const sources = [...html.matchAll(/<(?:script[^>]+src|link[^>]+rel="modulepreload"[^>]+href)="([^"]+\.js)"/g)];
  return sources.map((match) => `/${match[1].replace(/^\//, '')}`);
}

async function publishedFiles(browserDir) {
  const entries = await readdir(browserDir, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name !== SERVICE_WORKER_FILE)
    .map((entry) => join(entry.parentPath, entry.name))
    .sort();
}

async function contentVersion(browserDir, precache) {
  const hash = createHash('sha256').update(JSON.stringify(precache)).update(runServiceWorker.toString());
  for (const file of await publishedFiles(browserDir)) hash.update(file.slice(browserDir.length)).update(await readFile(file));
  return hash.digest('hex').slice(0, 12);
}

export async function writeServiceWorker(browserDir, stylesheetUrls, sampleHtml) {
  const precache = Array.from(new Set([...stylesheetUrls, ...initialScriptsOf(sampleHtml)])).sort();
  const version = await contentVersion(browserDir, precache);
  const source = `(${runServiceWorker.toString()})(${JSON.stringify({ version, precache })});\n`;
  await writeFile(join(browserDir, SERVICE_WORKER_FILE), source);
}
