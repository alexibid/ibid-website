import {
  HttpClient,
  HttpContext,
  HttpErrorResponse,
  HttpHeaders,
  HttpParams
} from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import type { CmsPage, CmsPageMetadata, CmsUrl } from '../../domain/models/cms.interface';
import type { PageType } from '../../domain/models/page-type.enum';
import { isRecord, toPageType } from '../../domain/models/static-routes.model';
import type { AdminContentRepository } from '../../domain/repositories/content.repository';
import { BYPASS_GLOBAL_ERROR } from '../interceptors/error.interceptor';
import { API_BASE_URL } from '../tokens/api-base-url.token';

export class ApiUnreachableError extends Error {
  constructor(message = 'Cannot reach the API server. Ensure ibid-website-api is running.') {
    super(message);
    this.name = 'ApiUnreachableError';
  }
}

function isUnreachableStatus(error: HttpErrorResponse): boolean {
  return error.status === 0 || error.status >= 500;
}

function extractErrorMessage(error: HttpErrorResponse): string {
  if (isRecord(error.error) && typeof error.error['message'] === 'string') {
    return error.error['message'];
  }
  return error.message || 'API request failed';
}

function toCmsPage(raw: unknown): CmsPage {
  if (
    !isRecord(raw) ||
    typeof raw['id'] !== 'string' ||
    typeof raw['title'] !== 'string' ||
    typeof raw['lang'] !== 'string'
  ) {
    throw new Error('Invalid page record from API');
  }
  const content = typeof raw['content'] === 'string' ? raw['content'] : '';
  const rawMetadata = isRecord(raw['metadata']) ? raw['metadata'] : undefined;
  const rawLocation = typeof raw['location'] === 'string' ? raw['location'] : undefined;
  const metaLocation =
    rawMetadata && typeof rawMetadata['location'] === 'string'
      ? rawMetadata['location']
      : undefined;
  const resolvedLocation = metaLocation ?? rawLocation;
  const metadata: CmsPageMetadata | undefined =
    rawMetadata !== undefined || resolvedLocation !== undefined
      ? {
          ...rawMetadata,
          ...(resolvedLocation !== undefined ? { location: resolvedLocation } : {})
        }
      : undefined;

  return {
    id: raw['id'],
    title: raw['title'],
    content,
    type: toPageType(raw['type']),
    lang: raw['lang'],
    ...(metadata !== undefined ? { metadata } : {})
  };
}

function toCmsPageList(raw: unknown): CmsPage[] {
  if (!Array.isArray(raw)) {
    throw new Error('Invalid pages response from API');
  }
  return raw.map(toCmsPage);
}

function extractExpandedPage(raw: Record<string, unknown>): CmsPage | undefined {
  if (isRecord(raw['page'])) {
    return toCmsPage(raw['page']);
  }
  const expand = raw['expand'];
  if (isRecord(expand) && isRecord(expand['page_id'])) {
    return toCmsPage(expand['page_id']);
  }
  return undefined;
}

function toCmsUrl(raw: unknown): CmsUrl {
  if (
    !isRecord(raw) ||
    typeof raw['id'] !== 'string' ||
    typeof raw['url'] !== 'string' ||
    typeof raw['lang'] !== 'string'
  ) {
    throw new Error('Invalid URL record from API');
  }
  const pageId =
    typeof raw['pageId'] === 'string'
      ? raw['pageId']
      : typeof raw['page_id'] === 'string'
        ? raw['page_id']
        : '';
  const expandedPage = extractExpandedPage(raw);
  return {
    id: raw['id'],
    url: raw['url'],
    lang: raw['lang'],
    page_id: pageId,
    ...(expandedPage !== undefined ? { expand: { page_id: expandedPage } } : {})
  };
}

function toCmsUrlList(raw: unknown): CmsUrl[] {
  if (!Array.isArray(raw)) {
    throw new Error('Invalid URLs response from API');
  }
  return raw.map(toCmsUrl);
}

@Injectable({
  providedIn: 'root'
})
export class ApiContentRepository implements AdminContentRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL).replace(/\/+$/, '');

  async loadSections(type: PageType, lang: string): Promise<CmsPage[]> {
    return this.getPages({ type, lang });
  }

  async getUrls(): Promise<CmsUrl[]> {
    const params = new HttpParams().set('expand', 'page');
    const raw = await this.send(
      this.http.get<unknown>(this.endpoint('/api/v1/urls'), this.readOptions(params))
    );
    return toCmsUrlList(raw);
  }

  async getPages(query?: { type?: string; lang?: string }): Promise<CmsPage[]> {
    let params = new HttpParams();
    if (query?.type) {
      params = params.set('type', query.type);
    }
    if (query?.lang) {
      params = params.set('lang', query.lang);
    }
    const raw = await this.send(
      this.http.get<unknown>(this.endpoint('/api/v1/pages'), this.readOptions(params))
    );
    return toCmsPageList(raw);
  }

  async getPage(id: string): Promise<CmsPage> {
    const raw = await this.send(
      this.http.get<unknown>(
        this.endpoint(`/api/v1/pages/${encodeURIComponent(id)}`),
        this.readOptions()
      )
    );
    return toCmsPage(raw);
  }

  async createPage(data: Partial<CmsPage>): Promise<CmsPage> {
    const raw = await this.send(
      this.http.post<unknown>(this.endpoint('/api/v1/pages'), data, this.mutationOptions())
    );
    return toCmsPage(raw);
  }

  async updatePage(id: string, data: Partial<CmsPage>): Promise<CmsPage> {
    const raw = await this.send(
      this.http.patch<unknown>(
        this.endpoint(`/api/v1/pages/${encodeURIComponent(id)}`),
        data,
        this.mutationOptions()
      )
    );
    return toCmsPage(raw);
  }

  async deletePage(id: string): Promise<void> {
    await this.send(
      this.http.delete<void>(
        this.endpoint(`/api/v1/pages/${encodeURIComponent(id)}`),
        this.mutationOptions()
      )
    );
  }

  async createUrl(data: Partial<CmsUrl>): Promise<CmsUrl> {
    const payload = {
      ...(data.id ? { id: data.id } : {}),
      url: data.url ?? '',
      lang: data.lang ?? '',
      pageId: data.page_id ?? ''
    };
    const raw = await this.send(
      this.http.post<unknown>(this.endpoint('/api/v1/urls'), payload, this.mutationOptions())
    );
    return toCmsUrl(raw);
  }

  async deleteUrl(id: string): Promise<void> {
    await this.send(
      this.http.delete<void>(
        this.endpoint(`/api/v1/urls/${encodeURIComponent(id)}`),
        this.mutationOptions()
      )
    );
  }

  async uploadImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    const raw = await this.send(
      this.http.post<unknown>(this.endpoint('/api/v1/media'), formData, this.mutationOptions())
    );
    if (!isRecord(raw) || typeof raw['url'] !== 'string') {
      throw new Error('Invalid media upload response from API');
    }
    return raw['url'];
  }

  private async send<T>(request$: Observable<T>): Promise<T> {
    try {
      return await firstValueFrom(request$);
    } catch (error) {
      throw this.mapError(error);
    }
  }

  private endpoint(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  private readOptions(params?: HttpParams): {
    headers: HttpHeaders;
    context: HttpContext;
    params?: HttpParams;
  } {
    return {
      headers: new HttpHeaders({ 'Cache-Control': 'no-cache' }),
      context: new HttpContext().set(BYPASS_GLOBAL_ERROR, true),
      ...(params !== undefined ? { params } : {})
    };
  }

  private mutationOptions(): { context: HttpContext } {
    return {
      context: new HttpContext().set(BYPASS_GLOBAL_ERROR, true)
    };
  }

  private mapError(error: unknown): Error {
    if (error instanceof HttpErrorResponse) {
      if (isUnreachableStatus(error)) {
        return new ApiUnreachableError();
      }
      return new Error(extractErrorMessage(error));
    }
    return error instanceof Error ? error : new Error('Unexpected API error');
  }
}
