import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { chromium } from 'playwright';
import { probeFold } from './fold-probe.browser.mjs';

export const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1280, height: 800 }
];

const ORIGIN = 'http://fold.localhost';
const CONTENT_TYPES = { '.css': 'text/css', '.html': 'text/html', '.webp': 'image/webp', '.svg': 'image/svg+xml' };

function fileForPath(browserDir, pathname) {
  const clean = decodeURIComponent(pathname).replace(/\/$/, '');
  return extname(clean) ? join(browserDir, clean) : join(browserDir, clean, 'index.html');
}

async function serveFromDisk(route, browserDir, measuredHtml) {
  const url = new URL(route.request().url());
  if (url.origin !== ORIGIN) return route.abort();
  if (url.pathname === '/__fold__') return route.fulfill({ body: measuredHtml.value, contentType: 'text/html' });
  try {
    const path = fileForPath(browserDir, url.pathname);
    const body = await readFile(path);
    return route.fulfill({ body, contentType: CONTENT_TYPES[extname(path)] ?? 'application/octet-stream' });
  } catch {
    return route.fulfill({ status: 404, body: '' });
  }
}

function withFullStyles(html, stylesheetPaths) {
  const links = stylesheetPaths.map((path) => `<link rel="stylesheet" href="/${path}">`).join('');
  return html.replace('</head>', `${links}</head>`);
}

async function measureViewport(context, units, viewport) {
  const page = await context.newPage();
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.goto(`${ORIGIN}/__fold__`, { waitUntil: 'load' });
  const result = await page.evaluate(probeFold, units);
  await page.close();
  return result;
}

export async function openFoldBrowser(browserDir) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ javaScriptEnabled: false, deviceScaleFactor: 1 });
  const measuredHtml = { value: '' };
  await context.route('**/*', (route) => serveFromDisk(route, browserDir, measuredHtml));

  const measure = async ({ html, stylesheetPaths, units }) => {
    measuredHtml.value = withFullStyles(html, stylesheetPaths);
    const results = [];
    for (const viewport of VIEWPORTS) results.push({ viewport, ...(await measureViewport(context, units, viewport)) });
    return results;
  };

  return { measure, close: () => browser.close() };
}
