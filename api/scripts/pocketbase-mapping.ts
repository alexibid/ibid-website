import {
  LANGUAGES,
  PAGE_TYPES,
  type PageType,
  type Language,
} from '../src/content/content.model.js';

export class InvalidPocketbaseRecordError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPocketbaseRecordError';
  }
}

export interface MappedPocketbasePage {
  readonly pbId: string;
  readonly title: string;
  readonly content: string;
  readonly type: PageType;
  readonly lang: Language;
  readonly location?: string;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export function toPageInput(record: unknown): MappedPocketbasePage {
  if (typeof record !== 'object' || record === null || Array.isArray(record)) {
    throw new InvalidPocketbaseRecordError('Record is not an object');
  }

  const rec = record as Record<string, unknown>;
  const { id, title, content, type, lang, metadata, location } = rec;

  if (typeof id !== 'string' || id.trim() === '') {
    throw new InvalidPocketbaseRecordError('Record missing id');
  }
  if (typeof title !== 'string' || title.trim() === '') {
    throw new InvalidPocketbaseRecordError('Record missing title');
  }
  if (typeof type !== 'string' || !(PAGE_TYPES as readonly string[]).includes(type)) {
    throw new InvalidPocketbaseRecordError(`Invalid type: ${String(type)}`);
  }
  if (typeof lang !== 'string' || !(LANGUAGES as readonly string[]).includes(lang)) {
    throw new InvalidPocketbaseRecordError(`Invalid lang: ${String(lang)}`);
  }

  let resolvedLocation: string | undefined;
  const cleanMetadata: Record<string, unknown> = {};

  if (typeof metadata === 'object' && metadata !== null && !Array.isArray(metadata)) {
    for (const [key, val] of Object.entries(metadata as Record<string, unknown>)) {
      if (key === 'location' && typeof val === 'string') {
        resolvedLocation = val;
      } else {
        cleanMetadata[key] = val;
      }
    }
  }

  if (resolvedLocation === undefined && typeof location === 'string') {
    resolvedLocation = location;
  }

  return {
    pbId: id,
    title,
    content: typeof content === 'string' ? content : '',
    type: type as PageType,
    lang: lang as Language,
    location: resolvedLocation,
    metadata: cleanMetadata,
  };
}

const POCKETBASE_URL_REGEX = /http:\/\/127\.0\.0\.1:8090\/api\/files\/[^/]+\/[^/]+\/([^"?]+)(?:\?[^"'>]*)?/g;

export function rewriteMediaUrls(content: string, mediaMap: ReadonlyMap<string, string>): string {
  return content.replace(POCKETBASE_URL_REGEX, (_match, filename: string) => {
    const mapped = mediaMap.get(filename);
    if (mapped === undefined) {
      throw new InvalidPocketbaseRecordError(`Missing media file: ${filename}`);
    }
    return `/api/v1/media/${mapped}`;
  });
}

export function countByTypeAndLang(
  pages: readonly { readonly type: string; readonly lang: string }[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const page of pages) {
    const key = `${page.type}/${page.lang}`;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}
