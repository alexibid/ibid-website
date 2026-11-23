import { inject } from '@angular/core';
import { Route, UrlSegment } from '@angular/router';
import { RoutingService } from '../services/routing.service';
import { PageType } from '../../domain/models/page-type.enum';

export type CmsPageMatcher = (route: Route, segments: readonly UrlSegment[]) => Promise<boolean>;

export function canMatchCmsPage(type: PageType): CmsPageMatcher {
  return async (_route, segments) => {
    const routing = inject(RoutingService);
    await routing.loadRoutes();
    return routing.hasPage(segments.map((segment) => segment.path).join('/'), type);
  };
}
