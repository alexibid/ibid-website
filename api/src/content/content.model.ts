export const PAGE_TYPES = ['home', 'chapter', 'exit'] as const;
export type PageType = (typeof PAGE_TYPES)[number];

export const LANGUAGES = ['pt', 'en', 'es', 'fr'] as const;
export type Language = (typeof LANGUAGES)[number];

export interface Page {
  readonly id: string;
  readonly title: string;
  readonly content: string;
  readonly type: PageType;
  readonly lang: Language;
  readonly location?: string;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface PageInput {
  readonly title: string;
  readonly content: string;
  readonly type: PageType;
  readonly lang: Language;
  readonly location?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface PagePatch {
  readonly title?: string;
  readonly content?: string;
  readonly type?: PageType;
  readonly lang?: Language;
  readonly location?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface Url {
  readonly id: string;
  readonly url: string;
  readonly lang: Language;
  readonly pageId: string;
}

export interface UrlInput {
  readonly url: string;
  readonly lang: Language;
  readonly pageId: string;
}

export interface PageQuery {
  readonly type?: PageType;
  readonly lang?: Language;
}
