import { RecordModel } from 'pocketbase';
import { PageType } from './page-type.enum';

export type PageLocation = 'front-cover' | 'index' | 'preface' | 'about' | 'contact-form' | 'back-cover' | string;

export interface CmsPage extends RecordModel {
  title: string;
  content: any;
  type: PageType;
  lang: string;
  metadata?: {
    location?: PageLocation;
    [key: string]: any;
  };
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
  content: any;
  metadata?: any;
  scrollTo?: string;
  location?: string;
}
