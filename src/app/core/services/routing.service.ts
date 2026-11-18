import { Injectable, inject, signal, effect } from '@angular/core';
import { Router, Route } from '@angular/router';
import { CONTENT_REPOSITORY } from './content-repository.token';
import { PageType } from '../../shared/types/page-type.enum';
import { CmsUrl, CmsRouteData } from '../../shared/types/cms.interface';
import { UiErrorService } from './ui-error.service';
import { BookService } from './book.service';
import { I18nService } from './i18n.service';
import { FrontofficeLayout } from '../layouts/frontoffice-layout/frontoffice-layout';
import { locationToInt } from '../../shared/utils/location.utils';

@Injectable({
  providedIn: 'root'
})
export class RoutingService {
  private readonly repo = inject(CONTENT_REPOSITORY);
  private readonly router = inject(Router);
  private readonly uiErrorService = inject(UiErrorService);
  private readonly bookService = inject(BookService);
  private readonly i18n = inject(I18nService);
  private allUrlRecords = signal<CmsUrl[]>([]);
  public readonly translationMap = new Map<string, { lang: string, url: string }[]>();

  constructor() {
    effect(() => {
      const records = this.allUrlRecords();
      if (records.length === 0) return;

      const lang = this.i18n.currentLangCode();
      const langRecords = records.filter(r => r.lang === lang);
      const homeRecord = langRecords
        .filter(r => r.expand?.page_id?.type === PageType.Home)
        .sort((a, b) => a.url.length - b.url.length)[0];

      const exitRecord = langRecords
        .filter(r => r.expand?.page_id?.type === PageType.Exit)
        .sort((a, b) => a.url.length - b.url.length)[0];

      const chapterRecords = langRecords
        .filter(r => r.expand?.page_id?.type === PageType.Chapter)
        .sort((a, b) => {
          const orderA = locationToInt(a.expand?.page_id?.metadata?.location);
          const orderB = locationToInt(b.expand?.page_id?.metadata?.location);
          return orderA - orderB;
        });

      const finalRecords = [];
      if (homeRecord) finalRecords.push(homeRecord);
      finalRecords.push(...chapterRecords);
      if (exitRecord) finalRecords.push(exitRecord);

      const routes = finalRecords.map(r => {
        let path = r.url;
        if (path.startsWith('/')) path = path.slice(1);
        const prefixedPath = r.lang + (path ? '/' + path : '');
        return {
          slug: prefixedPath,
          title: r.expand?.page_id?.title || '',
          type: r.expand?.page_id?.type as PageType
        };
      });

      this.bookService.setRouteOrder(routes);
    });
  }

  public async setupRoutes(): Promise<void> {
    try {
      const records = (await this.repo.getUrls()) as CmsUrl[];

      this.allUrlRecords.set(records);

      const dynamicRoutes: Route[] = [];

      for (const record of records) {
        const page = record.expand?.page_id;

        if (!page) {
          continue;
        }

        let componentLoader: Route['loadComponent'];
        const location = page.metadata?.location;

        let path = record.url;
        if (path.startsWith('/')) {
          path = path.slice(1);
        }

        const prefixedPath = record.lang + (path ? '/' + path : '');

        if (location) {
          const links = this.translationMap.get(location) || [];
          links.push({ lang: record.lang, url: '/' + prefixedPath });
          this.translationMap.set(location, links);
        }

        const routeData: CmsRouteData = {
          pageId: page.id,
          title: page.title,
          lang: record.lang,
          type: page.type,
          content: page.content,
          metadata: page.metadata,
          location: location,
        };

        switch (page.type) {
          case PageType.Home:
            componentLoader = async () => (await import('../../features/home/home')).Home;
            break;
          case PageType.Exit:
            componentLoader = async () => (await import('../../features/exit/exit')).Exit;
            break;
          case PageType.Chapter:
          default:
            componentLoader = async () => (await import('../../features/chapter/chapter')).Chapter;
            break;
        }

        dynamicRoutes.push({
          path: prefixedPath,
          loadComponent: componentLoader,
          data: routeData
        });
      }

      const currentConfig = this.router.config;
      const staticRoutes = currentConfig.filter(r => r.path !== '' && r.path !== '**');

      const newConfig: Route[] = [
        ...staticRoutes,
        {
          path: '',
          component: FrontofficeLayout,
          children: [
            {
              path: '',
              pathMatch: 'full',
              redirectTo: () => {
                const i18nService = inject(I18nService);
                return i18nService.currentLangCode();
              }
            },
            ...dynamicRoutes,
            { path: '**', loadComponent: async () => (await import('../../features/not-found/not-found')).NotFound }
          ]
        }
      ];

      this.router.resetConfig(newConfig);

    } catch (error: unknown) {
      console.error('Failed to initialize dynamic CMS routes', error);
      const pbError = error as { status?: number; isAbort?: boolean };
      if (pbError.status === 0 || pbError.isAbort) {
        this.uiErrorService.showError('error-network');
      } else {
        this.uiErrorService.showError('error-generic');
      }
    }
  }
}
