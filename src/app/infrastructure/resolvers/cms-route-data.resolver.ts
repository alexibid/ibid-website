import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { RoutingService } from '../services/routing.service';
import { CmsRouteData } from '../../domain/models/cms.interface';

type ResolvedCmsField = keyof Omit<CmsRouteData, 'scrollTo'>;

function resolvePage(route: ActivatedRouteSnapshot): CmsRouteData {
  return inject(RoutingService).getPage(route.url.map((segment) => segment.path).join('/'));
}

function resolveLocation(route: ActivatedRouteSnapshot): string {
  return resolvePage(route).location ?? '';
}

export const CMS_ROUTE_DATA_RESOLVERS: Readonly<Record<ResolvedCmsField, ResolveFn<unknown>>> = {
  pageId: (route) => resolvePage(route).pageId,
  title: (route) => resolvePage(route).title,
  lang: (route) => resolvePage(route).lang,
  type: (route) => resolvePage(route).type,
  content: (route) => resolvePage(route).content,
  metadata: (route) => resolvePage(route).metadata ?? { location: resolveLocation(route) },
  location: (route) => resolveLocation(route)
};
