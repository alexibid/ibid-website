import type { CmsPage, CmsUrl } from '../models/cms.interface';
import type { PageType } from '../models/page-type.enum';

export interface ContentReadRepository {
  loadSections(type: PageType, lang: string): Promise<CmsPage[]>;
  getUrls(): Promise<CmsUrl[]>;
  getPages(query?: { type?: string; lang?: string }): Promise<CmsPage[]>;
  getPage(id: string): Promise<CmsPage>;
}

export interface AdminContentRepository extends ContentReadRepository {
  createPage(data: Partial<CmsPage>): Promise<CmsPage>;
  updatePage(id: string, data: Partial<CmsPage>): Promise<CmsPage>;
  deletePage(id: string): Promise<void>;
  createUrl(data: Partial<CmsUrl>): Promise<CmsUrl>;
  deleteUrl(id: string): Promise<void>;
  uploadImage(file: File): Promise<string>;
}
