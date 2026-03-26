import { Injectable, inject } from '@angular/core';
import { Router, Route } from '@angular/router';
import { PocketbaseService } from './pocketbase.service';
import { PageType } from '../models/page-type.enum';
import { CmsUrl, CmsRouteData } from '../models/cms.interface';

@Injectable({
  providedIn: 'root'
})
export class CmsRouterService {
  private readonly pbService = inject(PocketbaseService);
  private readonly router = inject(Router);

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

        const routeData: CmsRouteData = {
          pageId: page.id,
          title: page.title,
          lang: record.lang,
          type: page.type,
          content: page.content,
          metadata: page.metadata,
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
    } catch (error) {
      console.error('Failed to initialize dynamic CMS routes', error);
      // In case of error (e.g., PocketBase offline), we might want to fallback safely.
    }
  }
}
