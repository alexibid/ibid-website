import { Injectable } from '@angular/core';
import type { CmsPage, CmsUrl } from '../../domain/models/cms.interface';
import { PageType } from '../../domain/models/page-type.enum';
import type { ContentRepository } from '../../domain/repositories/content.repository';
import snapshotData from '../../../content/content.snapshot.json';

interface SnapshotFile {
  readonly version: number;
  readonly pages: readonly {
    readonly id: string;
    readonly title: string;
    readonly content: string;
    readonly type: string;
    readonly lang: string;
    readonly location?: string;
    readonly metadata?: Record<string, unknown>;
  }[];
  readonly urls: readonly {
    readonly url: string;
    readonly lang: string;
    readonly pageId: string;
  }[];
}

@Injectable({
  providedIn: 'root',
})
export class SnapshotContentRepository implements ContentRepository {
  private readonly snapshot = snapshotData as unknown as SnapshotFile;

  async loadSections(type: PageType, lang: string): Promise<CmsPage[]> {
    const ptPages = this.snapshot.pages.filter((p) => p.type === type && p.lang === 'pt');
    if (lang === 'pt') {
      return ptPages.map((p) => this.toCmsPage(p));
    }
    const targetPages = this.snapshot.pages.filter((p) => p.type === type && p.lang === lang);
    const targetByLocation = new Map<string, SnapshotFile['pages'][number]>();
    for (const p of targetPages) {
      if (p.location && p.content && p.content.trim()) {
        targetByLocation.set(p.location, p);
      }
    }
    return ptPages.map((ptPage) => {
      const match = ptPage.location ? targetByLocation.get(ptPage.location) : undefined;
      return this.toCmsPage(match ?? ptPage);
    });
  }

  async getUrls(): Promise<CmsUrl[]> {
    const pageMap = new Map<string, CmsPage>();
    for (const p of this.snapshot.pages) {
      pageMap.set(p.id, this.toCmsPage(p));
    }

    return this.snapshot.urls.map((u) => ({
      id: u.pageId,
      url: u.url,
      lang: u.lang,
      page_id: u.pageId,
      expand: {
        page_id: pageMap.get(u.pageId),
      },
    }));
  }

  async getPages(query?: { type?: string; lang?: string }): Promise<CmsPage[]> {
    return this.snapshot.pages
      .filter((p) => {
        if (query?.type !== undefined && p.type !== query.type) {
          return false;
        }
        if (query?.lang !== undefined && p.lang !== query.lang) {
          return false;
        }
        return true;
      })
      .map((p) => this.toCmsPage(p));
  }

  async getPage(id: string): Promise<CmsPage> {
    const found = this.snapshot.pages.find((p) => p.id === id);
    if (!found) {
      throw new Error(`Page ${id} not found in snapshot`);
    }
    return this.toCmsPage(found);
  }

  async createPage(data: Partial<CmsPage>): Promise<CmsPage> {
    return {
      id: crypto.randomUUID(),
      title: data.title ?? '',
      content: data.content ?? '',
      type: data.type ?? PageType.Chapter,
      lang: data.lang ?? 'pt',
      metadata: data.metadata,
    };
  }

  async updatePage(id: string, data: Partial<CmsPage>): Promise<CmsPage> {
    const existing = await this.getPage(id);
    return { ...existing, ...data };
  }

  async deletePage(_id: string): Promise<void> {
    return Promise.resolve();
  }

  async login(password: string): Promise<boolean> {
    return password === '123';
  }

  async uploadImage(_file: File): Promise<string> {
    return '/content-media/uploaded.webp';
  }

  private toCmsPage(p: SnapshotFile['pages'][number]): CmsPage {
    return {
      id: p.id,
      title: p.title,
      content: p.content,
      type: p.type as PageType,
      lang: p.lang,
      metadata: {
        ...p.metadata,
        location: p.location,
      },
    };
  }
}
