import { PageType } from './page-type.enum';

export type PageLocation = 'front-cover' | 'index' | 'preface' | 'about' | 'contact-form' | 'back-cover' | string;

export interface CmsPageMetadata {
  location?: PageLocation;
  [key: string]: unknown;
}

export interface RecordModel {
  id?: string;
  created?: string;
  updated?: string;
}

export interface CmsPage extends RecordModel {
  id: string;
  title: string;
  content: string;
  type: PageType;
  lang: string;
  metadata?: CmsPageMetadata;
}

export interface CmsUrl extends RecordModel {
  id: string;
  url: string;
  page_id: string;
  lang: string;
  expand?: {
    page_id?: CmsPage;
  };
}

export interface CmsRouteData {
  pageId: string;
  title: string;
  lang: string;
  type: PageType;
  content: string;
  metadata?: CmsPageMetadata;
  scrollTo?: string;
  location?: string;
}

export interface CmsPagePayload {
  title: string;
  type: PageType;
  lang: string;
  content: string;
  metadata: {
    location: string;
  };
}

export interface CmsTranslationLink {
  readonly lang: string;
  readonly url: string;
}

export interface CmsRouteParams {
  readonly lang: string;
  readonly slug: string;
}

export interface CmsRouteTable {
  readonly pages: ReadonlyMap<string, CmsRouteData>;
  readonly translations: ReadonlyMap<string, readonly CmsTranslationLink[]>;
}

export interface CmsRouteOrderEntry {
  readonly slug: string;
  readonly title: string;
  readonly type: PageType;
}
