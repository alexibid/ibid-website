import { RenderMode, ServerRoute } from '@angular/ssr';
import { TestBed } from '@angular/core/testing';
import { serverRoutes } from './app.routes.server';
import { RoutingService } from './infrastructure/services/routing.service';
import { PRERENDER_FIXTURES } from '../mocks/app-routes.mock';

type PrerenderParams = Record<string, string>[];

interface PrerenderRoute {
  readonly path: string;
  readonly renderMode: RenderMode.Prerender;
  readonly getPrerenderParams: () => Promise<PrerenderParams>;
}

function isParameterisedPrerenderRoute(route: ServerRoute): route is ServerRoute & PrerenderRoute {
  return route.renderMode === RenderMode.Prerender && 'getPrerenderParams' in route;
}

function toPagePath(path: string, params: Record<string, string>): string {
  return path
    .split('/')
    .map((segment) => (segment.startsWith(':') ? params[segment.slice(1)] : segment))
    .join('/');
}

async function listPrerenderedPagePaths(): Promise<string[]> {
  const pagePaths: string[] = [];
  for (const route of serverRoutes.filter(isParameterisedPrerenderRoute)) {
    const params = await TestBed.runInInjectionContext(() => route.getPrerenderParams());
    pagePaths.push(...params.map((param) => toPagePath(route.path, param)));
  }
  return pagePaths;
}

describe('production server routes', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: RoutingService,
          useValue: { listRouteParams: vi.fn().mockResolvedValue(PRERENDER_FIXTURES.params) }
        }
      ]
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('should resolve prerender params from the routing service for every language', async () => {
    const pagePaths = await listPrerenderedPagePaths();

    expect([...pagePaths].sort()).toEqual([...PRERENDER_FIXTURES.pagePaths].sort());
    for (const lang of PRERENDER_FIXTURES.languages) {
      expect(pagePaths).toContain(lang);
      expect(pagePaths.some((path) => path.startsWith(`${lang}/`))).toBe(true);
    }
  });
});
