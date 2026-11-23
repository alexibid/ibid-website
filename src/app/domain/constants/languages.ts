export const SUPPORTED_LANGUAGE_CODES = ['pt', 'en', 'es', 'fr', 'de'] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGE_CODES)[number];

export interface LanguageLabel {
  readonly name: string;
  readonly optionLabel: string;
}

export const LANGUAGE_LABELS: Record<SupportedLanguage, LanguageLabel> = {
  pt: { name: 'Portuguese', optionLabel: 'Portuguese (PT)' },
  en: { name: 'English', optionLabel: 'English (EN)' },
  es: { name: 'Spanish', optionLabel: 'Spanish (ES)' },
  fr: { name: 'French', optionLabel: 'French (FR)' },
  de: { name: 'German', optionLabel: 'German (DE)' }
};

export function isSupportedLanguage(code: string): code is SupportedLanguage {
  return SUPPORTED_LANGUAGE_CODES.some((supported) => supported === code);
}

export function normalizeLanguageCode(raw: string): string {
  return raw.trim().split('-')[0].toLowerCase();
}

export function extractLanguageFromPath(url: string): string {
  const cleanPath = url.split('?')[0].split('#')[0];
  const segments = cleanPath.split('/').filter((segment) => segment.length > 0);
  if (segments.length === 0 || segments[0] === 'admin') {
    return '';
  }
  const candidate = segments[0].toLowerCase();
  return isSupportedLanguage(candidate) ? candidate : '';
}
