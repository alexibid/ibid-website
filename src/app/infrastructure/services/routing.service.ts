import { Injectable, inject, signal, effect } from '@angular/core';
import { CONTENT_READ_REPOSITORY } from '../tokens/content-repository.token';
import { PageType } from '../../domain/models/page-type.enum';
import {
  CmsRouteData,
  CmsRouteParams,
  CmsRouteTable,
  CmsUrl
} from '../../domain/models/cms.interface';
import { buildCmsRouteTable, buildRouteOrder } from '../../domain/utils/cms-route-table.utils';
import { UiErrorService } from './ui-error.service';
import { BookService } from './book.service';
import { I18nService, SUPPORTED_LANGUAGES } from './i18n.service';

const EMPTY_TABLE: CmsRouteTable = { pages: new Map(), translations: new Map() };

function isNetworkError(error: unknown): error is { readonly status?: number; readonly isAbort?: boolean } {
  return typeof error === 'object' && error !== null;
}

@Injectable({
  providedIn: 'root'
})
export class RoutingService {
  private readonly repo = inject(CONTENT_READ_REPOSITORY);
  private readonly uiErrorService = inject(UiErrorService);
  private readonly bookService = inject(BookService);
  private readonly i18n = inject(I18nService);
  private readonly supportedLanguages = inject(SUPPORTED_LANGUAGES);
  private readonly allUrlRecords = signal<readonly CmsUrl[]>([]);
  private table: CmsRouteTable = EMPTY_TABLE;
  private initialLoad?: Promise<void>;
  public readonly translationMap = new Map<string, { lang: string; url: string }[]>();

  constructor() {
    effect(() => {
      const records = this.allUrlRecords();
      if (records.length === 0) return;
      this.bookService.setRouteOrder(buildRouteOrder(records, this.i18n.currentLangCode()));
    });
  }

  public loadRoutes(): Promise<void> {
    this.initialLoad ??= this.refreshRoutes();
    return this.initialLoad;
  }

  public async refreshRoutes(): Promise<void> {
    try {
      this.applyRecords(await this.repo.getUrls());
    } catch (error: unknown) {
      this.applyRecords([]);
      this.reportFailure(error);
    }
  }

  public hasPage(path: string, type: PageType): boolean {
    return this.table.pages.get(path)?.type === type;
  }

  public getPage(path: string): CmsRouteData {
    const page = this.table.pages.get(path);
    if (!page) {
      throw new Error(`Unknown CMS page: ${path}`);
    }
    return page;
  }

  public async listRouteParams(): Promise<readonly CmsRouteParams[]> {
    await this.loadRoutes();
    return [...this.table.pages.keys()].map(toRouteParams);
  }

  private applyRecords(records: readonly CmsUrl[]): void {
    this.table = buildCmsRouteTable(records, this.supportedLanguages);
    this.translationMap.clear();
    for (const [location, links] of this.table.translations) {
      this.translationMap.set(location, [...links]);
    }
    this.allUrlRecords.set(records);
  }

  private reportFailure(error: unknown): void {
    console.error('Failed to load CMS routes', error);
    if (isNetworkError(error) && (error.status === 0 || error.isAbort)) {
      this.uiErrorService.showError('error-network');
    } else {
      this.uiErrorService.showError('error-generic');
    }
  }
}

function toRouteParams(key: string): CmsRouteParams {
  const separator = key.indexOf('/');
  return separator === -1
    ? { lang: key, slug: '' }
    : { lang: key.slice(0, separator), slug: key.slice(separator + 1) };
}
