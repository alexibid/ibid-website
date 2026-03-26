import { Injectable, inject } from '@angular/core';
import { Router, Route } from '@angular/router';
import { PocketbaseService } from './pocketbase.service';

@Injectable({
  providedIn: 'root'
})
export class CmsRouterService {
  private readonly pbService = inject(PocketbaseService);
  private readonly router = inject(Router);

  public async setupRoutes(): Promise<void> {
    try {
      // 1. Fetch routing table and expand related pages.
      const records = await this.pbService.pb.collection('urls').getFullList({
        expand: 'page_id',
      });

      const dynamicRoutes: Route[] = [];

      for (const record of records) {
        const page = record.expand?.['page_id'];
        
        if (!page) {
          continue;
        }

        let componentLoader: any;
        const location = page['metadata']?.location;
        
        let path = record['url'];
        if (path.startsWith('/')) {
          path = path.slice(1);
        }

        const routeData: Record<string, any> = {
          pageId: page.id,
          title: page['title'],
          lang: record['lang'],
          type: page['type'],
          content: page['content'],
          metadata: page['metadata'],
        };
        
        if (page['type'] === 'home') {
           // O 'prefacio' e outras secções não têm URL próprio, são apenas englobadas no Home render.
           if (location === 'front-cover') {
              // Permite resolver a rota de entrada (ex: /inicio, /home)
              componentLoader = async () => (await import('../../features/home/home')).Home;
           } else if (location === 'index') {
               // Rota específica para /indice que desencandeia o scroll
               componentLoader = async () => (await import('../../features/home/home')).Home;
               routeData['scrollTo'] = 'indice';
           } else {
               // Omitir prefacio e outros do Router
               continue;
           }
        } 
        else if (page['type'] === 'chapter') {
           componentLoader = async () => (await import('../../features/chapter/chapter')).Chapter;
        } 
        else if (page['type'] === 'exit') {
           // O form e agradecimento não têm URL próprio, tudo passa pelo Exit component.
           if (location === 'about') {
               componentLoader = async () => (await import('../../features/exit/exit')).Exit;
           } else {
               continue;
           }
        } 
        else {
           continue;
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
        { path: '**', redirectTo: '' } // Handles 404 by redirecting to Home placeholder
      ];

      this.router.resetConfig(newConfig);
    } catch (error) {
      console.error('Failed to initialize dynamic CMS routes', error);
      // In case of error (e.g., PocketBase offline), we might want to fallback safely.
    }
  }
}
