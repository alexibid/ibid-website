import { inject } from '@angular/core';
import { Route, Routes } from '@angular/router';
import { FrontofficeLayout } from './ui/layouts/frontoffice-layout/frontoffice-layout';
import { I18nService } from './infrastructure/services/i18n.service';
import { canMatchCmsPage } from './infrastructure/guards/cms-page.guard';
import { CMS_ROUTE_DATA_RESOLVERS } from './infrastructure/resolvers/cms-route-data.resolver';
import { pageStylesheetResolver } from './infrastructure/resolvers/page-stylesheet.resolver';
import { PageType } from './domain/models/page-type.enum';

type LazyPageComponent = Required<Pick<Route, 'loadComponent'>>;

const CMS_PAGE_PATHS: readonly string[] = [':lang', ':lang/:slug'];

const HOME_PAGE: LazyPageComponent = {
  loadComponent: () => import('./ui/pages/home/home').then((page) => page.Home)
};
const CHAPTER_PAGE: LazyPageComponent = {
  loadComponent: () => import('./ui/pages/chapter/chapter').then((page) => page.Chapter)
};
const EXIT_PAGE: LazyPageComponent = {
  loadComponent: () => import('./ui/pages/exit/exit').then((page) => page.Exit)
};

function cmsPageRoutes(type: PageType, lazyPage: LazyPageComponent): Routes {
  return CMS_PAGE_PATHS.map((path) => ({
    path,
    canMatch: [canMatchCmsPage(type)],
    resolve: { ...CMS_ROUTE_DATA_RESOLVERS, stylesheets: pageStylesheetResolver(type) },
    ...lazyPage
  }));
}

export const PUBLIC_ROUTES: Routes = [
  {
    path: '',
    component: FrontofficeLayout,
    children: [
      { path: '', pathMatch: 'full', redirectTo: () => inject(I18nService).currentLangCode() },
      ...cmsPageRoutes(PageType.Home, HOME_PAGE),
      ...cmsPageRoutes(PageType.Chapter, CHAPTER_PAGE),
      ...cmsPageRoutes(PageType.Exit, EXIT_PAGE),
      {
        path: '**',
        loadComponent: () =>
          import('./ui/components/not-found/not-found').then((page) => page.NotFound)
      }
    ]
  }
];
