import { Injectable, inject } from '@angular/core';
import { CONTENT_REPOSITORY } from './content-repository.token';
import type { CmsPage, CmsUrl, RecordModel } from '../../shared/types/cms.interface';

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private readonly repo = inject(CONTENT_REPOSITORY);

  async getPages(): Promise<readonly CmsPage[]> {
    return this.repo.getPages();
  }

  async getPage(id: string): Promise<CmsPage> {
    return this.repo.getPage(id);
  }

  async createPage(data: Partial<CmsPage>): Promise<CmsPage> {
    return this.repo.createPage(data);
  }

  async updatePage(id: string, data: Partial<CmsPage>): Promise<CmsPage> {
    return this.repo.updatePage(id, data);
  }

  async deletePage(id: string): Promise<void> {
    return this.repo.deletePage(id);
  }

  async getPagesByType(type: string, lang: string): Promise<readonly CmsPage[]> {
    return this.repo.getPages({ type, lang });
  }

  async getPageByLocation(type: string, lang: string, location: string): Promise<CmsPage | null> {
    const pages = await this.repo.getPages({ type, lang });
    return pages.find((p) => p.metadata?.location === location) ?? null;
  }

  async getUrls(): Promise<readonly CmsUrl[]> {
    return this.repo.getUrls();
  }

  async getUrl(id: string): Promise<CmsUrl> {
    const urls = await this.repo.getUrls();
    const found = urls.find((u) => u.id === id);
    if (!found) {
      throw new Error(`Url ${id} not found`);
    }
    return found;
  }

  async createUrl(data: Partial<CmsUrl>): Promise<CmsUrl> {
    return {
      id: crypto.randomUUID(),
      url: data.url ?? '',
      lang: data.lang ?? 'pt',
      page_id: data.page_id ?? '',
    };
  }

  async updateUrl(id: string, data: Partial<CmsUrl>): Promise<CmsUrl> {
    const existing = await this.getUrl(id);
    return { ...existing, ...data };
  }

  async deleteUrl(_id: string): Promise<void> {
    return Promise.resolve();
  }

  async uploadImage(file: File): Promise<string> {
    return this.repo.uploadImage(file);
  }

  getFileUrl(_record: RecordModel, fileName: string): string {
    return `/content-media/${fileName}`;
  }

  async uploadImageUrl(file: File): Promise<string> {
    return this.repo.uploadImage(file);
  }
}
