import { inject } from '@angular/core';
import { RenderMode, ServerRoute } from '@angular/ssr';
import { RoutingService } from './infrastructure/services/routing.service';
import { CmsRouteParams } from './domain/models/cms.interface';

async function listRouteParams(): Promise<readonly CmsRouteParams[]> {
  return inject(RoutingService).listRouteParams();
}

async function listLanguageParams(): Promise<Record<string, string>[]> {
  const params = await listRouteParams();
  return params.filter((param) => param.slug === '').map(({ lang }) => ({ lang }));
}

async function listSlugParams(): Promise<Record<string, string>[]> {
  const params = await listRouteParams();
  return params.filter((param) => param.slug !== '').map(({ lang, slug }) => ({ lang, slug }));
}

export const PUBLIC_SERVER_ROUTES: ServerRoute[] = [
  { path: ':lang', renderMode: RenderMode.Prerender, getPrerenderParams: listLanguageParams },
  { path: ':lang/:slug', renderMode: RenderMode.Prerender, getPrerenderParams: listSlugParams },
  { path: '**', renderMode: RenderMode.Prerender }
];
