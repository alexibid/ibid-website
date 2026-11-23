import type { CmsPage, CmsPageMetadata } from './cms.interface';
import { PageType } from './page-type.enum';

export interface StaticPageMetadata {
  readonly id: string;
  readonly title: string;
  readonly type: string;
  readonly lang: string;
  readonly location?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface StaticUrlEntry {
  readonly id: string;
  readonly url: string;
  readonly lang: string;
  readonly pageId: string;
}

export interface StaticMediaEntry {
  readonly id: string;
  readonly filename: string;
  readonly url: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
}

export interface StaticRoutesManifest {
  readonly version: number;
  readonly pages: readonly StaticPageMetadata[];
  readonly urls: readonly StaticUrlEntry[];
  readonly media: readonly StaticMediaEntry[];
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isPageType(value: unknown): value is PageType {
  return value === PageType.Home || value === PageType.Chapter || value === PageType.Exit;
}

export function toPageType(value: unknown, fallback: PageType = PageType.Chapter): PageType {
  return isPageType(value) ? value : fallback;
}

function isStaticPageMetadata(value: unknown): value is StaticPageMetadata {
  if (!isRecord(value)) {
    return false;
  }
  const hasRequiredStrings =
    typeof value['id'] === 'string' &&
    typeof value['title'] === 'string' &&
    typeof value['type'] === 'string' &&
    typeof value['lang'] === 'string';
  const hasValidLocation = value['location'] === undefined || typeof value['location'] === 'string';
  const hasValidMetadata = value['metadata'] === undefined || isRecord(value['metadata']);
  return hasRequiredStrings && hasValidLocation && hasValidMetadata;
}

function isStaticUrlEntry(value: unknown): value is StaticUrlEntry {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value['id'] === 'string' &&
    typeof value['url'] === 'string' &&
    typeof value['lang'] === 'string' &&
    typeof value['pageId'] === 'string'
  );
}

function isStaticMediaEntry(value: unknown): value is StaticMediaEntry {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value['id'] === 'string' &&
    typeof value['filename'] === 'string' &&
    typeof value['url'] === 'string' &&
    typeof value['mimeType'] === 'string' &&
    typeof value['sizeBytes'] === 'number'
  );
}

export function isStaticRoutesManifest(value: unknown): value is StaticRoutesManifest {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value['version'] === 'number' &&
    Array.isArray(value['pages']) &&
    value['pages'].every(isStaticPageMetadata) &&
    Array.isArray(value['urls']) &&
    value['urls'].every(isStaticUrlEntry) &&
    Array.isArray(value['media']) &&
    value['media'].every(isStaticMediaEntry)
  );
}

export function toCmsPageFromMetadata(meta: StaticPageMetadata, content = ''): CmsPage {
  const metaLocation =
    isRecord(meta.metadata) && typeof meta.metadata['location'] === 'string'
      ? meta.metadata['location']
      : undefined;
  const location = metaLocation ?? meta.location;
  const metadata: CmsPageMetadata | undefined =
    meta.metadata !== undefined || location !== undefined
      ? {
          ...meta.metadata,
          ...(location !== undefined ? { location } : {})
        }
      : undefined;

  return {
    id: meta.id,
    title: meta.title,
    content,
    type: toPageType(meta.type),
    lang: meta.lang,
    ...(metadata !== undefined ? { metadata } : {})
  };
}
