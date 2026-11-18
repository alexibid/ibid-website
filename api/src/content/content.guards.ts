import {
  LANGUAGES,
  type Language,
  PAGE_TYPES,
  type PageInput,
  type PagePatch,
  type PageQuery,
  type PageType,
  type UrlInput,
} from './content.model.js';

const ALLOWED_PAGE_INPUT_KEYS = new Set(['title', 'content', 'type', 'lang', 'location', 'metadata']);
const ALLOWED_URL_KEYS = new Set(['url', 'lang', 'pageId']);
const ALLOWED_QUERY_KEYS = new Set(['type', 'lang']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidPageType(value: unknown): value is PageType {
  return typeof value === 'string' && (PAGE_TYPES as readonly string[]).includes(value);
}

function isValidLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}

export function isPageInput(value: unknown): value is PageInput {
  if (!isRecord(value)) {
    return false;
  }

  const keys = Object.keys(value);
  for (const key of keys) {
    if (!ALLOWED_PAGE_INPUT_KEYS.has(key)) {
      return false;
    }
  }

  if (typeof value.title !== 'string' || value.title.trim() === '') {
    return false;
  }
  if (typeof value.content !== 'string') {
    return false;
  }
  if (!isValidPageType(value.type)) {
    return false;
  }
  if (!isValidLanguage(value.lang)) {
    return false;
  }
  if (value.location !== undefined && typeof value.location !== 'string') {
    return false;
  }
  if (value.metadata !== undefined && !isRecord(value.metadata)) {
    return false;
  }

  return true;
}

export function isPagePatch(value: unknown): value is PagePatch {
  if (!isRecord(value)) {
    return false;
  }

  const keys = Object.keys(value);
  if (keys.length === 0) {
    return false;
  }

  for (const key of keys) {
    if (!ALLOWED_PAGE_INPUT_KEYS.has(key)) {
      return false;
    }
  }

  if (value.title !== undefined && (typeof value.title !== 'string' || value.title.trim() === '')) {
    return false;
  }
  if (value.content !== undefined && typeof value.content !== 'string') {
    return false;
  }
  if (value.type !== undefined && !isValidPageType(value.type)) {
    return false;
  }
  if (value.lang !== undefined && !isValidLanguage(value.lang)) {
    return false;
  }
  if (value.location !== undefined && typeof value.location !== 'string') {
    return false;
  }
  if (value.metadata !== undefined && !isRecord(value.metadata)) {
    return false;
  }

  return true;
}

export function isUrlInput(value: unknown): value is UrlInput {
  if (!isRecord(value)) {
    return false;
  }

  const keys = Object.keys(value);
  if (keys.length !== 3) {
    return false;
  }
  for (const key of keys) {
    if (!ALLOWED_URL_KEYS.has(key)) {
      return false;
    }
  }

  if (typeof value.url !== 'string' || value.url.trim() === '') {
    return false;
  }
  if (!isValidLanguage(value.lang)) {
    return false;
  }
  if (typeof value.pageId !== 'string' || value.pageId.trim() === '') {
    return false;
  }

  return true;
}

export function isPageQuery(value: unknown): value is PageQuery {
  if (!isRecord(value)) {
    return false;
  }

  const keys = Object.keys(value);
  for (const key of keys) {
    if (!ALLOWED_QUERY_KEYS.has(key)) {
      return false;
    }
  }

  if (value.type !== undefined && !isValidPageType(value.type)) {
    return false;
  }
  if (value.lang !== undefined && !isValidLanguage(value.lang)) {
    return false;
  }

  return true;
}
