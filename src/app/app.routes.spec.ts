import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router } from '@angular/router';
import { routes } from './app.routes';
import { RoutingService } from './infrastructure/services/routing.service';
import { PageType } from './domain/models/page-type.enum';
import { PUBLIC_NAVIGATION_FIXTURES } from '../mocks/app-routes.mock';

function deepestRoute(router: Router): ActivatedRouteSnapshot {
  let current = router.routerState.snapshot.root;
  while (current.firstChild) {
    current = current.firstChild;
  }
  return current;
}

function matchedPaths(router: Router): string[] {
  const matched: string[] = [];
  let current = router.routerState.snapshot.root;
  while (current.firstChild) {
    current = current.firstChild;
    matched.push(current.routeConfig?.path ?? '');
  }
  return matched;
}

function isPublishedChapter(path: string, type: PageType): boolean {
  return path === PUBLIC_NAVIGATION_FIXTURES.chapterPath && type === PUBLIC_NAVIGATION_FIXTURES.chapterType;
}

describe('production routes', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        {
          provide: RoutingService,
          useValue: {
            loadRoutes: vi.fn().mockResolvedValue(undefined),
            hasPage: vi.fn(isPublishedChapter),
            getPage: vi.fn().mockReturnValue(PUBLIC_NAVIGATION_FIXTURES.chapter)
          }
        }
      ]
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('should open a published chapter at its language slug with its content', async () => {
    const router = TestBed.inject(Router);

    await router.navigateByUrl(PUBLIC_NAVIGATION_FIXTURES.chapterUrl);

    expect(router.url).toBe(PUBLIC_NAVIGATION_FIXTURES.chapterUrl);
    expect(matchedPaths(router)).not.toContain('**');
    expect(deepestRoute(router).data['title']).toBe(PUBLIC_NAVIGATION_FIXTURES.chapter.title);
    expect(deepestRoute(router).data['type']).toBe(PageType.Chapter);
  });

  it('should show the not-found page when visiting /admin', async () => {
    const router = TestBed.inject(Router);

    await router.navigateByUrl(PUBLIC_NAVIGATION_FIXTURES.adminUrl);

    expect(matchedPaths(router)).toContain('**');
    expect(matchedPaths(router)).not.toContain('admin');
  });
});
