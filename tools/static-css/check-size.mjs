import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { brotliCompressSync, constants, createBrotliCompress, createGzip } from 'node:zlib';

const KB = 1024;
const FOLD_WARNING = 14 * KB;
const LIMITS = {
  cssMobile: 10 * KB,
  cssDesktop: 50 * KB,
  criticalPath: 170 * KB
};
const BROTLI = { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } };

function compressedSize(content) {
  return brotliCompressSync(content, BROTLI).length;
}

function streamedPrefixSize(compressor, flushKind, html, prefixLength) {
  return new Promise((resolve, reject) => {
    let size = 0;
    compressor.on('data', (chunk) => { size += chunk.length; });
    compressor.on('error', reject);
    compressor.write(Buffer.from(html).subarray(0, prefixLength));
    compressor.flush(flushKind, () => resolve(size));
  });
}

function inlineCriticalCss(html) {
  return [...html.matchAll(/<style>([^<]*)<\/style>/g)].map((match) => match[1]).join('');
}

function initialScripts(html) {
  return [...html.matchAll(/<(?:script[^>]+src|link[^>]+rel="modulepreload"[^>]+href)="([^"]+\.js)"/g)].map((match) => match[1]);
}

async function sizesOf(browserDir, paths) {
  const sizes = await Promise.all(paths.map(async (path) => compressedSize(await readFile(join(browserDir, path.replace(/^\//, ''))))));
  return sizes.reduce((total, size) => total + size, 0);
}

function filesFor(bundleFiles, bundles, media) {
  return bundles.flatMap((name) => bundleFiles[name]).filter((file) => media.includes(file.media)).map((file) => file.path);
}

async function measurePage(browserDir, bundleFiles, page) {
  const html = await readFile(join(browserDir, page.file), 'utf8');
  const foldBytes = Buffer.byteLength(html.slice(0, page.foldEnd));
  const foldBrotli = await streamedPrefixSize(createBrotliCompress(BROTLI), constants.BROTLI_OPERATION_FLUSH, html, foldBytes);
  const foldGzip = await streamedPrefixSize(createGzip({ level: 9 }), constants.Z_SYNC_FLUSH, html, foldBytes);
  const inlineCss = compressedSize(inlineCriticalCss(html));
  const cssMobile = inlineCss + (await sizesOf(browserDir, filesFor(bundleFiles, page.bundles, [''])));
  const cssDesktop = inlineCss + (await sizesOf(browserDir, filesFor(bundleFiles, page.bundles, ['', '(min-width: 768px)'])));
  const htmlSize = compressedSize(html);
  const criticalPath = htmlSize + (await sizesOf(browserDir, initialScripts(html))) + cssDesktop - inlineCss;
  return { file: page.file, foldBrotli, foldGzip, htmlSize, cssMobile, cssDesktop, criticalPath };
}

function failuresOf(result) {
  return Object.entries(LIMITS).filter(([key, limit]) => result[key] > limit).map(([key, limit]) => `${result.file}: ${key} ${result[key]} B > ${limit} B`);
}

function warningsOf(result) {
  if (result.foldBrotli <= FOLD_WARNING) return [];
  return [`${result.file}: foldBrotli ${result.foldBrotli} B > ${FOLD_WARNING} B (+${result.foldBrotli - FOLD_WARNING} B)`];
}

function printTable(results) {
  console.log('page | fold br | fold gz | html br | css mobile | css desktop | critical path (bytes, brotli q11)');
  results.forEach((result) => {
    console.log([result.file, result.foldBrotli, result.foldGzip, result.htmlSize, result.cssMobile, result.cssDesktop, result.criticalPath].join(' | '));
  });
}

async function main(distDir) {
  const browserDir = join(distDir, 'browser');
  const { pages, bundleFiles } = JSON.parse(await readFile(join(distDir, 'static-css-report.json'), 'utf8'));
  const results = [];
  for (const page of pages) results.push(await measurePage(browserDir, bundleFiles, page));
  printTable(results);
  results.flatMap(warningsOf).forEach((warning) => console.warn(`Above-the-fold warning: ${warning}`));
  const failures = results.flatMap(failuresOf);
  failures.forEach((failure) => console.error(`Budget exceeded: ${failure}`));
  if (failures.length > 0) process.exitCode = 1;
}

await main(process.argv[2] ?? 'dist/ibid-website');
