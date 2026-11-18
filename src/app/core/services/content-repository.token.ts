import { InjectionToken } from '@angular/core';
import type { CmsPage, CmsUrl } from '../../shared/types/cms.interface';
import type { PageType } from '../../shared/types/page-type.enum';

export interface ContentRepository {
  loadSections(type: PageType, lang: string): Promise<readonly CmsPage[]>;
  getUrls(): Promise<readonly CmsUrl[]>;
  getPages(query?: { type?: string; lang?: string }): Promise<readonly CmsPage[]>;
  getPage(id: string): Promise<CmsPage>;
  createPage(data: Partial<CmsPage>): Promise<CmsPage>;
  updatePage(id: string, data: Partial<CmsPage>): Promise<CmsPage>;
  deletePage(id: string): Promise<void>;
  login(password: string): Promise<boolean>;
  uploadImage(file: File): Promise<string>;
}

export const CONTENT_REPOSITORY = new InjectionToken<ContentRepository>('CONTENT_REPOSITORY');
