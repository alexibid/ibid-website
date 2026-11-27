import { buildCmsRouteTable, buildRouteOrder } from './cms-route-table.utils';
import { PageType } from '../models/page-type.enum';
import {
  CMS_ROUTE_EXPECTATIONS,
  CMS_ROUTE_RECORDS,
  CMS_ROUTE_SUPPORTED_LANGUAGES
} from '../../../mocks/cms-route.mock';

describe('buildCmsRouteTable', () => {
  it('should key pages by language and url so every public page is prerenderable', () => {
    const table = buildCmsRouteTable(CMS_ROUTE_RECORDS.ptAndEn, CMS_ROUTE_SUPPORTED_LANGUAGES);

    expect(table.pages.get(CMS_ROUTE_EXPECTATIONS.homePtKey)?.type).toBe(PageType.Home);
    expect(table.pages.get(CMS_ROUTE_EXPECTATIONS.prefacePtKey)?.pageId).toBe('preface-pt');
    expect(table.pages.get(CMS_ROUTE_EXPECTATIONS.prefaceEnKey)?.lang).toBe('en');
  });

  it('should link translations of the same location with a leading slash and no duplicate language', () => {
    const table = buildCmsRouteTable(CMS_ROUTE_RECORDS.ptAndEn, CMS_ROUTE_SUPPORTED_LANGUAGES);

    const links = table.translations.get('preface') ?? [];
    expect(links).toContainEqual({ lang: 'pt', url: '/pt/prefacio' });
    expect(links).toContainEqual({ lang: 'en', url: '/en/preface' });

    const duplicated = buildCmsRouteTable(
      CMS_ROUTE_RECORDS.duplicateTranslation,
      CMS_ROUTE_SUPPORTED_LANGUAGES
    );
    const ptLinks = (duplicated.translations.get('preface') ?? []).filter((link) => link.lang === 'pt');
    expect(ptLinks).toHaveLength(1);
  });

  it('should link fallback home pages under front-cover', () => {
    const table = buildCmsRouteTable(CMS_ROUTE_RECORDS.ptAndEn, CMS_ROUTE_SUPPORTED_LANGUAGES);

    expect(table.translations.get('front-cover')).toContainEqual({ lang: 'de', url: '/de' });
  });

  it('should skip records without an expanded page', () => {
    const table = buildCmsRouteTable(CMS_ROUTE_RECORDS.withOrphan, CMS_ROUTE_SUPPORTED_LANGUAGES);

    expect(table.pages.has('pt/orphan')).toBe(false);
    expect(table.pages.get('pt')?.pageId).toBe('home-pt');
  });

  it('should return an empty table without fallbacks when there are no records', () => {
    const table = buildCmsRouteTable(CMS_ROUTE_RECORDS.empty, CMS_ROUTE_SUPPORTED_LANGUAGES);

    expect(table.pages.size).toBe(0);
    expect(table.translations.size).toBe(0);
  });

  it('should still add fallbacks when records exist but none has a page', () => {
    const table = buildCmsRouteTable(CMS_ROUTE_RECORDS.onlyOrphan, CMS_ROUTE_SUPPORTED_LANGUAGES);

    expect(table.pages.size).toBe(CMS_ROUTE_SUPPORTED_LANGUAGES.length);
  });

  it('should resolve exit page title and metadata to the localized contact title instead of the back-cover title regardless of record order', () => {
    for (const records of [CMS_ROUTE_RECORDS.exitContactFirst, CMS_ROUTE_RECORDS.exitBackCoverFirst]) {
      const table = buildCmsRouteTable(records, CMS_ROUTE_SUPPORTED_LANGUAGES);
      const ptExit = table.pages.get(CMS_ROUTE_EXPECTATIONS.exitPtKey);
      const frExit = table.pages.get(CMS_ROUTE_EXPECTATIONS.exitFrKey);

      expect(ptExit?.title).toBe(CMS_ROUTE_EXPECTATIONS.exitPtContactTitle);
      expect(ptExit?.location).toBe('contact-form');
      expect(ptExit?.metadata?.location).toBe('contact-form');

      expect(frExit?.title).toBe(CMS_ROUTE_EXPECTATIONS.exitFrContactTitle);
      expect(frExit?.location).toBe('contact-form');
      expect(frExit?.metadata?.location).toBe('contact-form');
    }
  });
});

describe('buildRouteOrder', () => {
  it('should order home first, chapters by location, exit last', () => {
    const order = buildRouteOrder(CMS_ROUTE_RECORDS.pt, 'pt');

    expect(order.map((entry) => entry.slug)).toEqual([
      'pt',
      'pt/prefacio',
      'pt/capitulo-um',
      'pt/capitulo-dois',
      'pt/saida'
    ]);
  });

  it('should pick the shortest home and exit urls when several exist', () => {
    const order = buildRouteOrder(CMS_ROUTE_RECORDS.ptWithLongerDuplicates, 'pt');

    expect(order.map((entry) => entry.slug)).toEqual(CMS_ROUTE_EXPECTATIONS.ptLongestDuplicatesSlugs);
  });

  it('should prefer contact-form over about and back-cover when exit urls have equal length', () => {
    const order = buildRouteOrder(CMS_ROUTE_RECORDS.exitOrderTieBreak, 'pt');

    expect(order).toEqual([
      {
        slug: CMS_ROUTE_EXPECTATIONS.exitOrderTieBreakSlug,
        title: CMS_ROUTE_EXPECTATIONS.exitPtContactTitle,
        type: PageType.Exit
      }
    ]);
  });

  it('should return only the language home placeholder for an empty list', () => {
    expect(buildRouteOrder(CMS_ROUTE_RECORDS.empty, 'de')).toEqual(
      CMS_ROUTE_EXPECTATIONS.emptyRouteOrder('de')
    );
  });

  it('should ignore records of other languages', () => {
    const order = buildRouteOrder(CMS_ROUTE_RECORDS.onlyEnglish, 'pt');

    expect(order).toEqual(CMS_ROUTE_EXPECTATIONS.emptyRouteOrder('pt'));
  });
});
