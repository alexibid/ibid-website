import { createHash } from 'node:crypto';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { DESKTOP_MEDIA, parseBundle, serializeDesktopUnits, serializeUnits } from './css-units.mjs';
import {
  bundlesForPage, criticalIdsOf, foldOf, inlinedEverywhereIds, lcpImagePathsOf, probeUnitsOf, visibleImagePathsOf
} from './critical-selection.mjs';
import { openFoldBrowser } from './fold-measure.mjs';
import { foldEndOffset, lazyLoadOffscreenImages, prioritizeImages } from './html-paths.mjs';
import { buildHeadMarkup, injectHead, manifestOf, stylesheetFiles } from './page-head.mjs';
import { writeServiceWorker } from './service-worker.mjs';

const BUNDLE_NAMES = ['layout', 'home', 'exit'];
const CSR_INDEX = 'index.csr.html';

function contentHash(content) {
  return createHash('sha256').update(content).digest('hex').slice(0, 8);
}

async function readBundles(browserDir) {
  const bundles = await Promise.all(
    BUNDLE_NAMES.map(async (name) => parseBundle(name, await readFile(join(browserDir, `${name}.css`), 'utf8')))
  );
  return Object.fromEntries(bundles.map((bundle) => [bundle.name, bundle]));
}

async function readPages(browserDir) {
  const { routes } = JSON.parse(await readFile(join(dirname(browserDir), 'prerendered-routes.json'), 'utf8'));
  const files = Object.keys(routes).filter((route) => route !== '/').map((route) => `${route.slice(1)}/index.html`);
  return Promise.all(files.map(async (file) => ({ file, html: await readFile(join(browserDir, file), 'utf8') })));
}

async function measurePage(foldBrowser, bundles, page) {
  const names = bundlesForPage(page.html);
  const units = names.flatMap((name) => bundles[name].units);
  const results = await foldBrowser.measure({
    html: page.html, stylesheetPaths: names.map((name) => `${name}.css`), units: probeUnitsOf(units)
  });
  return {
    ...page, bundles: names, criticalIds: criticalIdsOf(units, results),
    fold: foldOf(results), lcpImages: lcpImagePathsOf(results), visibleImages: visibleImagePathsOf(results)
  };
}

async function writeHashed(browserDir, stem, content) {
  if (!content) return undefined;
  const path = `${stem}-${contentHash(content)}.css`;
  await writeFile(join(browserDir, path), content);
  return path;
}

async function writeBundleFiles(browserDir, bundle, sharedIds) {
  const deferred = (desktop) => new Set(bundle.units.filter((unit) => unit.desktop === desktop && !sharedIds.has(unit.id)).map((unit) => unit.id));
  const basePath = await writeHashed(browserDir, bundle.name, serializeUnits(bundle, deferred(false)));
  const desktopPath = await writeHashed(browserDir, `${bundle.name}.desktop`, serializeDesktopUnits(bundle, deferred(true)));
  await rm(join(browserDir, `${bundle.name}.css`));
  return [
    basePath && { bundle: bundle.name, path: basePath, media: '' },
    desktopPath && { bundle: bundle.name, path: desktopPath, media: DESKTOP_MEDIA }
  ].filter(Boolean);
}

function criticalCssOf(bundles, page) {
  return page.bundles.map((name) => serializeUnits(bundles[name], page.criticalIds)).join('');
}

async function writePage(browserDir, context, page) {
  const markup = buildHeadMarkup({
    criticalCss: criticalCssOf(context.bundles, page),
    files: stylesheetFiles(context.bundleFiles, page.bundles)
  });
  const body = lazyLoadOffscreenImages(prioritizeImages(page.html, page.lcpImages), page.visibleImages);
  const html = injectHead(body, { markup, manifest: context.manifest });
  await writeFile(join(browserDir, page.file), html);
  return { file: page.file, bundles: page.bundles, foldEnd: foldEndOffset(html, page.fold), lcpImages: page.lcpImages.length };
}

async function writeCsrIndex(browserDir, context) {
  const path = join(browserDir, CSR_INDEX);
  const files = stylesheetFiles(context.bundleFiles, ['layout']);
  const markup = buildHeadMarkup({ criticalCss: '', files });
  const html = injectHead(await readFile(path, 'utf8'), { markup, manifest: context.manifest });
  await writeFile(path, html);
}

async function measureAll(browserDir, bundles, pages) {
  const foldBrowser = await openFoldBrowser(browserDir);
  try {
    const measured = [];
    for (const page of pages) measured.push(await measurePage(foldBrowser, bundles, page));
    return measured;
  } finally {
    await foldBrowser.close();
  }
}

async function main(browserDir) {
  const bundles = await readBundles(browserDir);
  const pages = await measureAll(browserDir, bundles, await readPages(browserDir));
  const bundleFiles = {};
  for (const name of BUNDLE_NAMES) {
    bundleFiles[name] = await writeBundleFiles(browserDir, bundles[name], inlinedEverywhereIds(pages, name));
  }
  const context = { bundles, bundleFiles, manifest: manifestOf(bundleFiles) };
  const report = [];
  for (const page of pages) report.push(await writePage(browserDir, context, page));
  await writeCsrIndex(browserDir, context);
  await writeServiceWorker(browserDir, Object.values(bundleFiles).flat().map((file) => `/${file.path}`), pages[0].html);
  await writeFile(join(dirname(browserDir), 'static-css-report.json'), JSON.stringify({ pages: report, bundleFiles }, null, 2));
}

await main(process.argv[2] ?? 'dist/ibid-website/browser');
