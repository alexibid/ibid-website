import { Injectable, inject } from '@angular/core';
import { Router, Route } from '@angular/router';
import { PocketbaseService } from './pocketbase.service';
import { PageType } from '../models/page-type.enum';
import { CmsUrl, CmsRouteData } from '../models/cms.interface';
import { UiErrorService } from './ui-error.service';

@Injectable({
  providedIn: 'root'
})
export class CmsRouterService {
  private readonly pbService = inject(PocketbaseService);
  private readonly router = inject(Router);
  private readonly uiErrorService = inject(UiErrorService);

  // Mapa global: location -> array de traduções disponíveis para essa página
  public readonly translationMap = new Map<string, { lang: string, url: string }[]>();

  public async setupRoutes(): Promise<void> {
    try {
      const records = await this.pbService.pb.collection('urls').getFullList<CmsUrl>({
        expand: 'page_id',
      });

      const dynamicRoutes: Route[] = [];

      for (const record of records) {
        const page = record.expand?.page_id;

        if (!page) {
          continue;
        }

        let componentLoader: any;
        const location = page.metadata?.location;

        let path = record.url;
        if (path.startsWith('/')) {
          path = path.slice(1);
        }

        if (location) {
          const links = this.translationMap.get(location) || [];
          links.push({ lang: record.lang, url: '/' + path });
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
          path: path,
          loadComponent: componentLoader,
          data: routeData
        });
      }

      const currentConfig = this.router.config;
      const staticRoutes = currentConfig.filter(r => r.path !== '**');

      const newConfig: Route[] = [
        ...staticRoutes,
        { path: '', loadComponent: async () => (await import('../../features/home/home')).Home },
        ...dynamicRoutes,
        { path: '**', loadComponent: async () => (await import('../../features/not-found/not-found')).NotFound }
      ];

      this.router.resetConfig(newConfig);
    } catch (error: any) {
      console.error('Failed to initialize dynamic CMS routes', error);
      
      // Se não conseguir chegar à BD do PocketBase (ex: offline), dispara o Error Banner!
      if (error.status === 0 || error.isAbort) {
        this.uiErrorService.showError('error-network');
      } else {
        this.uiErrorService.showError('error-generic');
      }
    }
  }
}
