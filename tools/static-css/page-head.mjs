import { DESKTOP_MEDIA } from './css-units.mjs';

export const MANIFEST_ID = 'website-stylesheets';
const FONT_ORIGIN = 'https://fonts.gstatic.com';
const SWAP_TO_STYLESHEET = "this.onload=null;this.rel='stylesheet'";

function mediaAttribute(file) {
  return file.media ? ` media="${file.media}"` : '';
}

function preloadLink(file) {
  return `<link rel="preload" href="/${file.path}" as="style"${mediaAttribute(file)} onload="${SWAP_TO_STYLESHEET}" data-stylesheet="${file.bundle}">`;
}

function fallbackLink(file) {
  return `<link rel="stylesheet" href="/${file.path}"${mediaAttribute(file)}>`;
}

export function stylesheetFiles(bundleFiles, bundleNames) {
  return bundleNames.flatMap((name) => bundleFiles[name] ?? []);
}

export function manifestOf(bundleFiles) {
  const bundles = Object.fromEntries(
    Object.entries(bundleFiles).map(([name, files]) => [name, files.map((file) => ({ href: `/${file.path}`, media: file.media }))])
  );
  return { desktopMedia: DESKTOP_MEDIA, bundles };
}

export function buildHeadMarkup({ criticalCss, files }) {
  return [
    `<link rel="preconnect" href="${FONT_ORIGIN}" crossorigin>`,
    criticalCss ? `<style>${criticalCss}</style>` : '',
    ...files.map(preloadLink),
    `<noscript>${files.map(fallbackLink).join('')}</noscript>`
  ].join('');
}

function manifestMarkup(manifest) {
  return `<script type="application/json" id="${MANIFEST_ID}">${JSON.stringify(manifest)}</script>`;
}

export function injectHead(html, { markup, manifest }) {
  const charsetEnd = html.indexOf('>', html.search(/<meta charset/i)) + 1;
  const bodyEnd = html.lastIndexOf('</body>');
  return `${html.slice(0, charsetEnd)}${markup}${html.slice(charsetEnd, bodyEnd)}${manifestMarkup(manifest)}${html.slice(bodyEnd)}`;
}
