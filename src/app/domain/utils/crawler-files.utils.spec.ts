import { buildRobots, buildSitemap, sitemapEntriesOf, sitemapUrlOf } from './crawler-files.utils';

const FAKE_ORIGIN = 'https://fake-site.example';

function fakePage(route: string, canonicalPath: string): { route: string; html: string } {
  const links = [
    canonicalPath ? `<link rel="canonical" href="${FAKE_ORIGIN}${canonicalPath}">` : '',
    `<link rel="alternate" href="${FAKE_ORIGIN}/aa/fake" hreflang="aa">`,
    `<link rel="alternate" href="${FAKE_ORIGIN}/bb/fake" hreflang="bb">`,
    `<link rel="alternate" href="${FAKE_ORIGIN}/aa/fake" hreflang="x-default">`,
    '<link rel="alternate" type="application/rss+xml" href="/feed.xml">',
    '<link rel="stylesheet" href="layout-abcdefgh.css">'
  ];
  return { route, html: `<html><head>${links.join('')}</head><body></body></html>` };
}

describe('crawler files', () => {
  it('should list only pages whose canonical matches their own route, once each', () => {
    const entries = sitemapEntriesOf([
      fakePage('/', ''),
      fakePage('/aa/fake', '/aa/fake'),
      fakePage('/aa/fake', '/aa/fake'),
      fakePage('/bb/fake', '/bb/fake'),
      fakePage('/bb/copy', '/bb/fake')
    ]);

    expect(entries.map((entry) => entry.location)).toEqual([`${FAKE_ORIGIN}/aa/fake`, `${FAKE_ORIGIN}/bb/fake`]);
  });

  it('should keep exactly the hreflang alternates the page declares', () => {
    const [entry] = sitemapEntriesOf([fakePage('/aa/fake', '/aa/fake')]);

    expect(entry.alternates).toEqual([
      { hreflang: 'aa', href: `${FAKE_ORIGIN}/aa/fake` },
      { hreflang: 'bb', href: `${FAKE_ORIGIN}/bb/fake` },
      { hreflang: 'x-default', href: `${FAKE_ORIGIN}/aa/fake` }
    ]);
  });

  it('should write a sitemap with loc and xhtml alternates and no invented fields', () => {
    const sitemap = buildSitemap(sitemapEntriesOf([fakePage('/aa/fake', '/aa/fake')]));
    const document = new DOMParser().parseFromString(sitemap, 'application/xml');

    expect(document.querySelector('parsererror')).toBeNull();
    expect(document.getElementsByTagName('loc')[0]?.textContent).toBe(`${FAKE_ORIGIN}/aa/fake`);
    expect(document.getElementsByTagName('xhtml:link')).toHaveLength(3);
    expect(sitemap).not.toMatch(/lastmod|priority|changefreq/);
  });

  it('should escape XML special characters in addresses', () => {
    const sitemap = buildSitemap([{ location: `${FAKE_ORIGIN}/a?b=1&amp;c=<2>`, alternates: [] }]);

    expect(sitemap).toContain(`<loc>${FAKE_ORIGIN}/a?b=1&amp;c=&lt;2&gt;</loc>`);
  });

  it('should point robots at the sitemap on the canonical origin and keep crawlers off admin and api', () => {
    const entries = sitemapEntriesOf([fakePage('/aa/fake', '/aa/fake')]);
    const robots = buildRobots(sitemapUrlOf(entries));

    expect(robots).toBe(
      `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nSitemap: ${FAKE_ORIGIN}/sitemap.xml\n`
    );
  });

  it('should refuse to build a sitemap address when no page has a matching canonical', () => {
    expect(() => sitemapUrlOf([])).toThrowError(/no sitemap/);
  });
});
