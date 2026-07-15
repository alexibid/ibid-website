import { RecordModel } from 'pocketbase';
import { PageType } from './page-type.enum';

export type PageLocation = 'front-cover' | 'index' | 'preface' | 'about' | 'contact-form' | 'back-cover' | string;

export interface CmsPageMetadata {
  location?: PageLocation;
  [key: string]: unknown;
}

export interface CmsPage extends RecordModel {
  title: string;
  content: string;
  type: PageType;
  lang: string;
  metadata?: CmsPageMetadata;
}

export interface CmsUrl extends RecordModel {
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
