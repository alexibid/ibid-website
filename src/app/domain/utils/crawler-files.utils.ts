export interface BuiltPage {
  readonly route: string;
  readonly html: string;
}

export interface PageAlternate {
  readonly hreflang: string;
  readonly href: string;
}

export interface SitemapEntry {
  readonly location: string;
  readonly alternates: readonly PageAlternate[];
}

type LinkAttributes = ReadonlyMap<string, string>;

const LINK_TAG = /<link\b[^>]*>/gi;
const TAG_ATTRIBUTE = /([\w-]+)="([^"]*)"/g;
const SITEMAP_PATH = '/sitemap.xml';
const DISALLOWED_PATHS = ['/admin', '/api/'] as const;
const XML_ESCAPES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;'
};

function linkAttributesOf(html: string): readonly LinkAttributes[] {
  return [...html.matchAll(LINK_TAG)].map(
    ([tag]) => new Map([...tag.matchAll(TAG_ATTRIBUTE)].map(([, name, value]) => [name.toLowerCase(), value]))
  );
}

function isCanonicalFor(canonical: string, route: string): boolean {
  return URL.canParse(canonical) && new URL(canonical).pathname === route;
}

function alternatesOf(links: readonly LinkAttributes[]): readonly PageAlternate[] {
  return links
    .filter((link) => link.get('rel') === 'alternate' && link.has('hreflang'))
    .map((link) => ({ hreflang: link.get('hreflang') ?? '', href: link.get('href') ?? '' }));
}

function sitemapEntryOf(page: BuiltPage): readonly SitemapEntry[] {
  const links = linkAttributesOf(page.html);
  const canonical = links.find((link) => link.get('rel') === 'canonical')?.get('href') ?? '';
  return isCanonicalFor(canonical, page.route) ? [{ location: canonical, alternates: alternatesOf(links) }] : [];
}

export function sitemapEntriesOf(pages: readonly BuiltPage[]): readonly SitemapEntry[] {
  const entries = pages.flatMap((page) => sitemapEntryOf(page));
  return [...new Map(entries.map((entry) => [entry.location, entry])).values()];
}

function escapeXml(text: string): string {
  return text.replace(/&amp;/g, '&').replace(/[&<>"']/g, (character) => XML_ESCAPES[character] ?? character);
}

function urlElementOf(entry: SitemapEntry): string {
  const alternates = entry.alternates.map(
    (alternate) =>
      `    <xhtml:link rel="alternate" hreflang="${escapeXml(alternate.hreflang)}" href="${escapeXml(alternate.href)}"/>\n`
  );
  return `  <url>\n    <loc>${escapeXml(entry.location)}</loc>\n${alternates.join('')}  </url>\n`;
}

export function buildSitemap(entries: readonly SitemapEntry[]): string {
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
    entries.map((entry) => urlElementOf(entry)).join('') +
    '</urlset>\n'
  );
}

export function sitemapUrlOf(entries: readonly SitemapEntry[]): string {
  if (entries.length === 0) {
    throw new Error('No built page has a canonical link matching its route, so there is no sitemap to point to.');
  }
  return new URL(SITEMAP_PATH, entries[0].location).href;
}

export function buildRobots(sitemapUrl: string): string {
  const disallowed = DISALLOWED_PATHS.map((path) => `Disallow: ${path}\n`).join('');
  return `User-agent: *\nAllow: /\n${disallowed}\nSitemap: ${sitemapUrl}\n`;
}
