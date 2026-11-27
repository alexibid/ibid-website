import { vi } from 'vitest';
import type { CmsPage, CmsRouteData, CmsUrl } from '../app/domain/models/cms.interface';
import { PageType } from '../app/domain/models/page-type.enum';
import type { ContentReadRepository } from '../app/domain/repositories/content.repository';

function buildPage(id: string, type: PageType, lang: string, location: string): CmsPage {
  return {
    id,
    title: `title-${id}`,
    content: `<p>${id}</p>`,
    type,
    lang,
    metadata: { location }
  };
}

function buildUrl(url: string, page: CmsPage): CmsUrl {
  return { id: `url-${page.id}`, url, page_id: page.id, lang: page.lang, expand: { page_id: page } };
}

const HOME_PT = buildPage('home-pt', PageType.Home, 'pt', 'front-cover');
const HOME_PT_LONG = buildPage('home-pt-long', PageType.Home, 'pt', 'front-cover');
const PREFACE_PT = buildPage('preface-pt', PageType.Chapter, 'pt', 'preface');
const CHAPTER_II_PT = buildPage('chapter-ii-pt', PageType.Chapter, 'pt', 'II');
const CHAPTER_I_PT = buildPage('chapter-i-pt', PageType.Chapter, 'pt', 'I');
const EXIT_PT = buildPage('exit-pt', PageType.Exit, 'pt', 'back-cover');
const EXIT_PT_LONG = buildPage('exit-pt-long', PageType.Exit, 'pt', 'back-cover');
const EXIT_PT_CONTACT = buildPage('exit-pt-contact', PageType.Exit, 'pt', 'contact-form');
const EXIT_PT_ABOUT = buildPage('exit-pt-about', PageType.Exit, 'pt', 'about');
const EXIT_PT_BACK = buildPage('exit-pt-back', PageType.Exit, 'pt', 'back-cover');
const EXIT_FR_CONTACT = buildPage('exit-fr-contact', PageType.Exit, 'fr', 'contact-form');
const EXIT_FR_ABOUT = buildPage('exit-fr-about', PageType.Exit, 'fr', 'about');
const EXIT_FR_BACK = buildPage('exit-fr-back', PageType.Exit, 'fr', 'back-cover');
const PREFACE_EN = buildPage('preface-en', PageType.Chapter, 'en', 'preface');
const HOME_EN = buildPage('home-en', PageType.Home, 'en', 'front-cover');

const ORPHAN_URL: CmsUrl = { id: 'url-orphan', url: 'orphan', page_id: 'missing', lang: 'pt' };

const EMPTY_URLS: readonly CmsUrl[] = [];

export const CMS_ROUTE_SUPPORTED_LANGUAGES: readonly string[] = ['pt', 'en', 'es', 'fr', 'de'];

export const CMS_ROUTE_RECORDS = {
  pt: [
    buildUrl('', HOME_PT),
    buildUrl('prefacio', PREFACE_PT),
    buildUrl('capitulo-dois', CHAPTER_II_PT),
    buildUrl('capitulo-um', CHAPTER_I_PT),
    buildUrl('saida', EXIT_PT)
  ],
  ptWithLongerDuplicates: [
    buildUrl('inicio-extenso', HOME_PT_LONG),
    buildUrl('', HOME_PT),
    buildUrl('saida-extensa', EXIT_PT_LONG),
    buildUrl('saida', EXIT_PT)
  ],
  ptAndEn: [
    buildUrl('', HOME_PT),
    buildUrl('prefacio', PREFACE_PT),
    buildUrl('', HOME_EN),
    buildUrl('preface', PREFACE_EN)
  ],
  withOrphan: [buildUrl('', HOME_PT), ORPHAN_URL],
  onlyOrphan: [ORPHAN_URL],
  onlyEnglish: [buildUrl('preface', PREFACE_EN)],
  duplicateTranslation: [buildUrl('prefacio', PREFACE_PT), buildUrl('prefacio-bis', PREFACE_PT)],
  exitContactFirst: [
    buildUrl('contactos', EXIT_PT_CONTACT),
    buildUrl('contactos', EXIT_PT_ABOUT),
    buildUrl('contactos', EXIT_PT_BACK),
    buildUrl('contact', EXIT_FR_CONTACT),
    buildUrl('contact', EXIT_FR_ABOUT),
    buildUrl('contact', EXIT_FR_BACK)
  ],
  exitBackCoverFirst: [
    buildUrl('contactos', EXIT_PT_BACK),
    buildUrl('contactos', EXIT_PT_ABOUT),
    buildUrl('contactos', EXIT_PT_CONTACT),
    buildUrl('contact', EXIT_FR_BACK),
    buildUrl('contact', EXIT_FR_ABOUT),
    buildUrl('contact', EXIT_FR_CONTACT)
  ],
  exitOrderTieBreak: [
    buildUrl('z-back', EXIT_PT_BACK),
    buildUrl('z-abot', EXIT_PT_ABOUT),
    buildUrl('z-cont', EXIT_PT_CONTACT)
  ],
  empty: EMPTY_URLS
};

export const CMS_ROUTE_EXPECTATIONS = {
  homePtKey: 'pt',
  prefacePtKey: 'pt/prefacio',
  prefaceEnKey: 'en/preface',
  exitPtKey: 'pt/contactos',
  exitFrKey: 'fr/contact',
  exitPtContactTitle: 'title-exit-pt-contact',
  exitFrContactTitle: 'title-exit-fr-contact',
  exitOrderTieBreakSlug: 'pt/z-cont',
  fallbackHome: (lang: string): CmsRouteData => ({
    pageId: `fallback-${lang}-home`,
    title: 'IBID',
    lang,
    type: PageType.Home,
    content: '',
    location: 'front-cover'
  }),
  emptyRouteOrder: (lang: string) => [{ slug: lang, title: 'IBID', type: PageType.Home }],
  ptRouteOrderSlugs: ['pt', 'pt/capitulo-um', 'pt/capitulo-dois', 'pt/saida'],
  ptLongestDuplicatesSlugs: ['pt', 'pt/saida'],
  unknownKey: 'pt/nao-existe'
};

export function createCmsRouteRepository(
  urls: readonly CmsUrl[]
): { [K in keyof ContentReadRepository]: ReturnType<typeof vi.fn> } {
  return {
    loadSections: vi.fn().mockResolvedValue([]),
    getUrls: vi.fn().mockResolvedValue(urls),
    getPages: vi.fn().mockResolvedValue([]),
    getPage: vi.fn().mockRejectedValue(new Error('unused'))
  };
}

export const CMS_ROUTE_FAILURES = {
  network: { status: 0 },
  abort: { isAbort: true },
  server: { status: 500 }
};

export const CMS_ROUTE_NO_STORE = {
  header: 'Cache-Control',
  value: 'no-store'
};
