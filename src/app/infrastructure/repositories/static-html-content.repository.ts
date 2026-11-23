import { isPlatformServer } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, TransferState, inject, makeStateKey, type StateKey } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { CmsPage, CmsUrl } from '../../domain/models/cms.interface';
import type { PageType } from '../../domain/models/page-type.enum';
import {
  type StaticRoutesManifest,
  isStaticRoutesManifest,
  toCmsPageFromMetadata
} from '../../domain/models/static-routes.model';
import type { ContentReadRepository } from '../../domain/repositories/content.repository';

const SAFE_PATH_SEGMENT = /^[a-zA-Z0-9._-]+$/;
const ROUTES_MANIFEST_KEY = makeStateKey<StaticRoutesManifest>('static-routes-manifest');
const EMPTY_MANIFEST: StaticRoutesManifest = {
  version: 1,
  pages: [],
  urls: [],
  media: []
};

function makeHtmlStateKey(lang: string, pageId: string): StateKey<string> {
  return makeStateKey<string>(`static-page-html:${lang}:${pageId}`);
}

function assertSafePathSegment(value: string, label: string): string {
  if (
    value.length === 0 ||
    value.trim() !== value ||
    value === '.' ||
    value === '..' ||
    value.includes('..') ||
    !SAFE_PATH_SEGMENT.test(value)
  ) {
    throw new Error(`Invalid ${label} path segment`);
  }
  return value;
}

@Injectable({
  providedIn: 'root'
})
export class StaticHtmlContentRepository implements ContentReadRepository {
  private readonly http = inject(HttpClient);
  private readonly transferState = inject(TransferState);
  private readonly platformId = inject(PLATFORM_ID);

  private manifestCache: StaticRoutesManifest | undefined;
  private pendingManifest: Promise<StaticRoutesManifest> | undefined;
  private readonly htmlCache = new Map<string, string>();

  async loadSections(type: PageType, lang: string): Promise<CmsPage[]> {
    const safeLang = assertSafePathSegment(lang, 'lang');
    const manifest = await this.loadManifest();
    const matching = manifest.pages.filter((page) => page.type === type && page.lang === safeLang);
    if (matching.length === 0) {
      return [];
    }
    return Promise.all(
      matching.map(async (meta) => {
        const content = await this.fetchPageHtml(meta.lang, meta.id);
        return toCmsPageFromMetadata(meta, content);
      })
    );
  }

  async getUrls(): Promise<CmsUrl[]> {
    const manifest = await this.loadManifest();
    const pageMap = new Map(manifest.pages.map((page) => [page.id, page]));
    return manifest.urls.map((entry) => {
      const pageMeta = pageMap.get(entry.pageId);
      return {
        id: entry.id,
        url: entry.url,
        lang: entry.lang,
        page_id: entry.pageId,
        ...(pageMeta ? { expand: { page_id: toCmsPageFromMetadata(pageMeta, '') } } : {})
      };
    });
  }

  async getPages(query?: { type?: string; lang?: string }): Promise<CmsPage[]> {
    const manifest = await this.loadManifest();
    return manifest.pages
      .filter((page) => {
        if (query?.type !== undefined && page.type !== query.type) {
          return false;
        }
        if (query?.lang !== undefined && page.lang !== query.lang) {
          return false;
        }
        return true;
      })
      .map((page) => toCmsPageFromMetadata(page, ''));
  }

  async getPage(id: string): Promise<CmsPage> {
    const safeId = assertSafePathSegment(id, 'pageId');
    const manifest = await this.loadManifest();
    const meta = manifest.pages.find((page) => page.id === safeId);
    if (!meta) {
      throw new Error(`Page not found in static manifest: ${safeId}`);
    }
    const content = await this.fetchPageHtml(meta.lang, meta.id);
    return toCmsPageFromMetadata(meta, content);
  }

  private loadManifest(): Promise<StaticRoutesManifest> {
    if (this.manifestCache !== undefined) {
      return Promise.resolve(this.manifestCache);
    }
    if (this.transferState.hasKey(ROUTES_MANIFEST_KEY)) {
      const cached = this.transferState.get(ROUTES_MANIFEST_KEY, EMPTY_MANIFEST);
      if (isStaticRoutesManifest(cached)) {
        this.manifestCache = cached;
        return Promise.resolve(cached);
      }
    }
    if (this.pendingManifest !== undefined) {
      return this.pendingManifest;
    }
    this.pendingManifest = this.fetchManifest();
    return this.pendingManifest;
  }

  private async fetchManifest(): Promise<StaticRoutesManifest> {
    try {
      const raw: unknown = await firstValueFrom(this.http.get<unknown>('/pages/routes.json'));
      if (!isStaticRoutesManifest(raw)) {
        throw new Error('Invalid static routes manifest');
      }
      this.manifestCache = raw;
      if (isPlatformServer(this.platformId)) {
        this.transferState.set(ROUTES_MANIFEST_KEY, raw);
      }
      return raw;
    } finally {
      this.pendingManifest = undefined;
    }
  }

  private async fetchPageHtml(lang: string, pageId: string): Promise<string> {
    const safeLang = assertSafePathSegment(lang, 'lang');
    const safeId = assertSafePathSegment(pageId, 'pageId');
    const cacheKey = `${safeLang}/${safeId}`;
    const cachedHtml = this.htmlCache.get(cacheKey);
    if (cachedHtml !== undefined) {
      return cachedHtml;
    }
    const stateKey = makeHtmlStateKey(safeLang, safeId);
    if (this.transferState.hasKey(stateKey)) {
      const transferred = this.transferState.get(stateKey, '');
      this.htmlCache.set(cacheKey, transferred);
      return transferred;
    }
    const html = await firstValueFrom(
      this.http.get(`/pages/${safeLang}/${safeId}.html`, { responseType: 'text' })
    );
    this.htmlCache.set(cacheKey, html);
    if (isPlatformServer(this.platformId)) {
      this.transferState.set(stateKey, html);
    }
    return html;
  }
}
