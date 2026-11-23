import { inject, Type } from '@angular/core';
import { Routes } from '@angular/router';
import { FrontofficeLayout } from './ui/layouts/frontoffice-layout/frontoffice-layout';
import { I18nService } from './infrastructure/services/i18n.service';
import { canMatchCmsPage } from './infrastructure/guards/cms-page.guard';
import { CMS_ROUTE_DATA_RESOLVERS } from './infrastructure/resolvers/cms-route-data.resolver';
import { PageType } from './domain/models/page-type.enum';

type ComponentLoader = () => Promise<Type<unknown>>;

const CMS_PAGE_PATHS: readonly string[] = [':lang', ':lang/:slug'];

const loadHome: ComponentLoader = async () => (await import('./ui/pages/home/home')).Home;
const loadChapter: ComponentLoader = async () => (await import('./ui/pages/chapter/chapter')).Chapter;
const loadExit: ComponentLoader = async () => (await import('./ui/pages/exit/exit')).Exit;
const loadNotFound: ComponentLoader = async () =>
  (await import('./ui/components/not-found/not-found')).NotFound;

function cmsPageRoutes(type: PageType, loadComponent: ComponentLoader): Routes {
  return CMS_PAGE_PATHS.map((path) => ({
    path,
    canMatch: [canMatchCmsPage(type)],
    resolve: CMS_ROUTE_DATA_RESOLVERS,
    loadComponent
  }));
}

export const PUBLIC_ROUTES: Routes = [
  {
    path: '',
    component: FrontofficeLayout,
    children: [
      { path: '', pathMatch: 'full', redirectTo: () => inject(I18nService).currentLangCode() },
      ...cmsPageRoutes(PageType.Home, loadHome),
      ...cmsPageRoutes(PageType.Chapter, loadChapter),
      ...cmsPageRoutes(PageType.Exit, loadExit),
      { path: '**', loadComponent: loadNotFound }
    ]
  }
];
