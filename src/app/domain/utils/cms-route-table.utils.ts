import {
  CmsPage,
  CmsRouteData,
  CmsRouteOrderEntry,
  CmsRouteTable,
  CmsTranslationLink,
  CmsUrl
} from '../models/cms.interface';
import { PageType } from '../models/page-type.enum';
import { locationToInt } from './location.utils';

const FALLBACK_LOCATION = 'front-cover';
const FALLBACK_TITLE = 'IBID';
export const EXIT_LOCATION_PRECEDENCE = ['contact-form', 'about', 'back-cover'] as const;

export function exitLocationRank(location?: string): number {
  const index = EXIT_LOCATION_PRECEDENCE.findIndex((entry) => entry === location);
  return index === -1 ? EXIT_LOCATION_PRECEDENCE.length : index;
}

export function toRouteKey(record: CmsUrl): string {
  const path = record.url.startsWith('/') ? record.url.slice(1) : record.url;
  return record.lang + (path ? '/' + path : '');
}

export function buildCmsRouteTable(
  records: readonly CmsUrl[],
  languages: readonly string[]
): CmsRouteTable {
  const pages = new Map<string, CmsRouteData>();
  const translations = new Map<string, readonly CmsTranslationLink[]>();

  for (const record of records) {
    addRecord(record, pages, translations);
  }
  if (records.length > 0) {
    addFallbackHomes(languages, pages, translations);
  }
  return { pages, translations };
}

export function buildRouteOrder(records: readonly CmsUrl[], lang: string): CmsRouteOrderEntry[] {
  const langRecords = records.filter((record) => record.lang === lang);
  if (langRecords.length === 0) {
    return [{ slug: lang, title: FALLBACK_TITLE, type: PageType.Home }];
  }
  return orderRecords(langRecords).map(toRouteOrderEntry);
}

function addRecord(
  record: CmsUrl,
  pages: Map<string, CmsRouteData>,
  translations: Map<string, readonly CmsTranslationLink[]>
): void {
  const page = record.expand?.page_id;
  if (!page) {
    return;
  }
  const key = toRouteKey(record);
  const location = page.metadata?.location;
  if (location) {
    addTranslation(translations, location, { lang: record.lang, url: '/' + key });
  }
  const candidate = toRouteData(page, record.lang);
  if (shouldOverwritePage(pages.get(key), candidate)) {
    pages.set(key, candidate);
  }
}

function shouldOverwritePage(
  existing: CmsRouteData | undefined,
  candidate: CmsRouteData
): boolean {
  if (!existing || existing.type !== candidate.type) {
    return true;
  }
  if (candidate.type === PageType.Exit) {
    return exitLocationRank(candidate.location) <= exitLocationRank(existing.location);
  }
  return candidate.type !== PageType.Home || canReplaceHomePage(existing, candidate);
}

function canReplaceHomePage(existing: CmsRouteData, candidate: CmsRouteData): boolean {
  return existing.location !== FALLBACK_LOCATION || candidate.location === FALLBACK_LOCATION;
}

function toRouteData(page: CmsPage, lang: string): CmsRouteData {
  return {
    pageId: page.id,
    title: page.title,
    lang,
    type: page.type,
    content: page.content,
    metadata: page.metadata,
    location: page.metadata?.location
  };
}

function addFallbackHomes(
  languages: readonly string[],
  pages: Map<string, CmsRouteData>,
  translations: Map<string, readonly CmsTranslationLink[]>
): void {
  for (const lang of languages.filter((code) => !pages.has(code))) {
    pages.set(lang, toFallbackHome(lang));
    addTranslation(translations, FALLBACK_LOCATION, { lang, url: '/' + lang });
  }
}

function toFallbackHome(lang: string): CmsRouteData {
  return {
    pageId: `fallback-${lang}-home`,
    title: FALLBACK_TITLE,
    lang,
    type: PageType.Home,
    content: '',
    location: FALLBACK_LOCATION
  };
}

function addTranslation(
  translations: Map<string, readonly CmsTranslationLink[]>,
  location: string,
  link: CmsTranslationLink
): void {
  const links = translations.get(location) ?? [];
  if (!links.some((entry) => entry.lang === link.lang)) {
    translations.set(location, [...links, link]);
  }
}

function orderRecords(langRecords: readonly CmsUrl[]): readonly CmsUrl[] {
  const home = shortestOfType(langRecords, PageType.Home);
  const exit = recordsOfType(langRecords, PageType.Exit).sort(compareExitRecords).slice(0, 1);
  const chapters = recordsOfType(langRecords, PageType.Chapter).sort(
    (first, second) => locationOf(first) - locationOf(second)
  );
  return [...home, ...chapters, ...exit];
}

function compareExitRecords(first: CmsUrl, second: CmsUrl): number {
  return (
    first.url.length - second.url.length ||
    exitLocationRank(first.expand?.page_id?.metadata?.location) -
      exitLocationRank(second.expand?.page_id?.metadata?.location)
  );
}

function shortestOfType(records: readonly CmsUrl[], type: PageType): readonly CmsUrl[] {
  const sorted = recordsOfType(records, type).sort(
    (first, second) => first.url.length - second.url.length
  );
  return sorted.slice(0, 1);
}

function recordsOfType(records: readonly CmsUrl[], type: PageType): CmsUrl[] {
  return records.filter((record) => record.expand?.page_id?.type === type);
}

function locationOf(record: CmsUrl): number {
  return locationToInt(record.expand?.page_id?.metadata?.location);
}

function toRouteOrderEntry(record: CmsUrl): CmsRouteOrderEntry {
  return {
    slug: toRouteKey(record),
    title: record.expand?.page_id?.title ?? '',
    type: record.expand?.page_id?.type ?? PageType.Chapter
  };
}
