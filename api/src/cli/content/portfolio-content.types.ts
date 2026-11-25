import { assertCleanUtf8Html } from '../content-encoding.util';

export const SUPPORTED_LANGS = ['pt', 'en', 'es', 'fr', 'de'] as const;

export type SupportedLang = (typeof SUPPORTED_LANGS)[number];

export type PortfolioPageType = 'home' | 'chapter' | 'exit';

export const HOME_LOCATIONS = ['front-cover', 'index', 'preface'] as const;

export const CHAPTER_LOCATIONS = [
  'I',
  'II',
  'III',
  'IV',
  'V',
  'VI',
  'VII',
  'VIII',
  'IX',
] as const;

export const EXIT_LOCATIONS = ['about', 'contact-form', 'back-cover'] as const;

export const EXIT_SLUGS_BY_LANG: Readonly<Record<SupportedLang, string>> = {
  pt: 'contactos',
  en: 'contacts',
  es: 'contacto',
  fr: 'coordonnees',
  de: 'kontakt',
};

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const FORBIDDEN_TEXT_PATTERNS: readonly RegExp[] = [
  /\bUnitel\b/i,
  /\bBESI\b/i,
  /\bConoco(?:Phillips)?\b/i,
  /\bVodacom\b/i,
  /\bErnst\s*&\s*Young\b/i,
  /\bEY\b/,
  /\bATA\b/,
  /Academia de T[eé]nis/i,
  /\bQ\+B\b/i,
  /\b(?:tese|thesis|disserta[cç][aã]o|dissertation|thèse|tesis)\b/i,
  /\bThese\b/,
  /DRIVE\//,
  /CACILHAS\//,
  /PAPIKAPI\//,
  /\[NOME DO SOFTWARE\]/i,
  /\[CAPTURA A FAZER\]/i,
  /\[A FORNECER\]/i,
  /\[A DEFINIR\]/i,
  /\[TEXTO /i,
  /\[DESCRIÇÃO /i,
  /\[LIGAÇÃO /i,
  /\[anos\b/i,
  /mailto:/i,
  /github\.com\/alexibid\/(?:ibid-ui|boilerplate|services|testing|utils|tools|ibid-agents)\b/i,
  /github\.com\/alexibid\/ibid-workspace\/tree\/main\/libs\/ibid-ui\b/i,
  /\bnx\b/i,
  /workspace-menu/i,
  /media-slot-ch5-nx-graph/i,
  /media-slot-ch5-menubar-app/i,
  /\bmenu\s*bar\b/i,
  /barra\s+de\s+men[uú]s/i,
  /barre\s+de\s+menus/i,
  /Men[uü]leisten/i,
  /\bVS[\s-]Code\b/i,
  /\bboilerplate\b/i,
];
const IMG_TAG_PATTERN = /<img\b[^>]*>/gi;
const SRC_ATTR_PATTERN = /\bsrc="([^"]*)"/i;
const ALT_ATTR_PATTERN = /\balt="([^"]*)"/i;

export interface PortfolioEntryMetadata {
  readonly location: string;
}

export interface PortfolioEntry {
  readonly id?: string;
  readonly type: PortfolioPageType;
  readonly lang: SupportedLang;
  readonly location: string;
  readonly slug: string;
  readonly title: string;
  readonly content: string;
  readonly metadata?: PortfolioEntryMetadata;
}

export interface SyncPortfolioOptions {
  readonly contentDir?: string;
  readonly exportStatic?: boolean;
}

export interface PortfolioSyncResult {
  readonly pagesRepaired: number;
  readonly pagesSynced: number;
  readonly urlsSynced: number;
  readonly mediaPreserved: number;
  readonly staticExported: boolean;
  readonly countsByTypeAndLang: Readonly<Record<string, Readonly<Record<string, number>>>>;
}

export function isRecordValue(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isSupportedLang(value: unknown): value is SupportedLang {
  return (
    typeof value === 'string' &&
    SUPPORTED_LANGS.some((supported) => supported === value)
  );
}

export function isPortfolioPageType(value: unknown): value is PortfolioPageType {
  return value === 'home' || value === 'chapter' || value === 'exit';
}

export function resolvePortfolioEntryId(entry: PortfolioEntry): string {
  const trimmed = entry.id?.trim();
  return trimmed ? trimmed : `${entry.lang}-${entry.type}-${entry.location.toLowerCase()}`;
}

export function parsePortfolioContentFile(
  rawJson: string,
  expectedLang: SupportedLang,
  filePath: string,
): PortfolioEntry[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error(`Invalid JSON in content file: ${filePath}`);
  }
  if (!Array.isArray(parsed)) {
    throw new Error(`Expected array of entries in content file: ${filePath}`);
  }
  return parsed.map((item, index) => parsePortfolioEntry(item, expectedLang, index));
}

export function validatePortfolioDataset(entries: readonly PortfolioEntry[]): void {
  if (entries.length !== SUPPORTED_LANGS.length * 15) {
    throw new Error(`Expected 75 portfolio entries, received ${entries.length}`);
  }
  for (const lang of SUPPORTED_LANGS) {
    validateLanguageEntries(
      lang,
      entries.filter((entry) => entry.lang === lang),
    );
  }
}

function parsePortfolioEntry(
  raw: unknown,
  expectedLang: SupportedLang,
  index: number,
): PortfolioEntry {
  if (!isRecordValue(raw)) {
    throw new Error(`Invalid entry object at index ${index} for ${expectedLang}`);
  }
  const { id, type, lang, location, slug, title, content, metadata } = raw;
  if (!isPortfolioPageType(type) || !isSupportedLang(lang) || lang !== expectedLang) {
    throw new Error(`Invalid type or lang at index ${index} for ${expectedLang}`);
  }
  if (
    typeof location !== 'string' ||
    typeof slug !== 'string' ||
    typeof title !== 'string' ||
    typeof content !== 'string'
  ) {
    throw new Error(`Missing required string fields at index ${index} for ${expectedLang}`);
  }
  if (id !== undefined && typeof id !== 'string') {
    throw new Error(`Entry id must be a string at index ${index} for ${expectedLang}`);
  }
  let parsedMetadata: PortfolioEntryMetadata | undefined;
  if (metadata !== undefined) {
    if (!isRecordValue(metadata) || typeof metadata['location'] !== 'string') {
      throw new Error(`Invalid metadata object at index ${index} for ${expectedLang}`);
    }
    parsedMetadata = { location: metadata['location'] };
  }
  return {
    ...(id !== undefined ? { id } : {}),
    type,
    lang,
    location,
    slug,
    title,
    content,
    ...(parsedMetadata !== undefined ? { metadata: parsedMetadata } : {}),
  };
}

function validateLanguageEntries(
  lang: SupportedLang,
  entries: readonly PortfolioEntry[],
): void {
  if (entries.length !== 15) {
    throw new Error(`Expected 15 entries for ${lang}, received ${entries.length}`);
  }
  assertOrderedLocations(entries.filter((e) => e.type === 'home'), HOME_LOCATIONS, `${lang}:home`);
  assertOrderedLocations(
    entries.filter((e) => e.type === 'chapter'),
    CHAPTER_LOCATIONS,
    `${lang}:chapter`,
  );
  assertOrderedLocations(entries.filter((e) => e.type === 'exit'), EXIT_LOCATIONS, `${lang}:exit`);

  const chapterVIII = entries.find((e) => e.location === 'VIII');
  if (!chapterVIII || !`${chapterVIII.title} ${chapterVIII.content}`.includes('Solum')) {
    throw new Error(`Chapter VIII for ${lang} must reference Solum`);
  }
  for (const entry of entries) {
    validateSingleEntry(lang, entry);
  }
}

function assertOrderedLocations(
  entries: readonly PortfolioEntry[],
  expected: readonly string[],
  context: string,
): void {
  if (entries.length !== expected.length) {
    throw new Error(`Expected ${expected.length} entries for ${context}, received ${entries.length}`);
  }
  for (let i = 0; i < expected.length; i++) {
    if (entries[i].location !== expected[i]) {
      throw new Error(
        `Invalid location order in ${context}: expected ${expected[i]}, received ${entries[i].location}`,
      );
    }
  }
}

function validateSingleEntry(lang: SupportedLang, entry: PortfolioEntry): void {
  const context = `${lang}:${entry.type}:${entry.location}`;
  if (entry.title.trim().length === 0 || entry.content.trim().length === 0) {
    throw new Error(`Empty title or content in ${context}`);
  }
  if (entry.metadata !== undefined && entry.metadata.location !== entry.location) {
    throw new Error(`Mismatched metadata.location in ${context}`);
  }
  assertCleanUtf8Html(entry.title, `${context}:title`);
  assertCleanUtf8Html(entry.content, `${context}:content`);
  validateSlug(lang, entry, context);
  validateTextCompliance(
    `${entry.id ?? ''} ${entry.slug} ${entry.title} ${entry.content}`,
    context,
  );
  validateImageTags(entry.content, context);
}

function validateSlug(lang: SupportedLang, entry: PortfolioEntry, context: string): void {
  if (entry.slug.startsWith('/') || /\s/.test(entry.slug)) {
    throw new Error(`Invalid slug format in ${context}: ${entry.slug}`);
  }
  if (entry.location === 'front-cover' && entry.slug !== '') {
    throw new Error(`front-cover slug must be empty in ${context}`);
  }
  if ((entry.type === 'chapter' || entry.location === 'index') && entry.slug.length === 0) {
    throw new Error(`Non-empty slug required in ${context}`);
  }
  if (entry.type === 'exit' && entry.slug !== EXIT_SLUGS_BY_LANG[lang]) {
    throw new Error(
      `Exit slug in ${context} must be ${EXIT_SLUGS_BY_LANG[lang]}, received ${entry.slug}`,
    );
  }
}

function validateTextCompliance(text: string, context: string): void {
  if (EMAIL_PATTERN.test(text)) {
    throw new Error(`Email address detected in ${context}`);
  }
  for (const pattern of FORBIDDEN_TEXT_PATTERNS) {
    if (pattern.test(text)) {
      throw new Error(`Forbidden pattern ${pattern.source} detected in ${context}`);
    }
  }
}

function validateImageTags(html: string, context: string): void {
  const regex = new RegExp(IMG_TAG_PATTERN.source, 'gi');
  let match = regex.exec(html);
  while (match !== null) {
    const tag = match[0];
    const src = SRC_ATTR_PATTERN.exec(tag)?.[1]?.trim() ?? '';
    const alt = ALT_ATTR_PATTERN.exec(tag)?.[1]?.trim() ?? '';
    const hasValidPrefix = src.startsWith('https://') || src.startsWith('/images/');
    if (!hasValidPrefix || alt.length === 0) {
      throw new Error(`Invalid image tag in ${context}`);
    }
    match = regex.exec(html);
  }
}
