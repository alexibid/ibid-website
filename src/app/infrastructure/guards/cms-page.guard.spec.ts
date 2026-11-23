import { TestBed } from '@angular/core/testing';
import { Route, UrlSegment } from '@angular/router';
import { canMatchCmsPage } from './cms-page.guard';
import { RoutingService } from '../services/routing.service';
import { PageType } from '../../domain/models/page-type.enum';
import { CMS_ROUTE_GUARD_CASES } from '../../../mocks/cms-route-guard.mock';

function runGuard(type: PageType, paths: readonly string[]): Promise<unknown> {
  const segments = paths.map((path) => new UrlSegment(path, {}));
  const route: Route = {};
  return Promise.resolve(
    TestBed.runInInjectionContext(() => canMatchCmsPage(type)(route, segments))
  );
}

describe('canMatchCmsPage', () => {
  let loadRoutes: ReturnType<typeof vi.fn>;
  let hasPage: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    loadRoutes = vi.fn().mockResolvedValue(undefined);
    hasPage = vi.fn((path: string, type: PageType) =>
      CMS_ROUTE_GUARD_CASES.knownPages.some((page) => page.path === path && page.type === type)
    );
    TestBed.configureTestingModule({
      providers: [{ provide: RoutingService, useValue: { loadRoutes, hasPage } }]
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('should match a known chapter by joining the url segments with a slash', async () => {
    await expect(runGuard(PageType.Chapter, ['pt', 'prefacio'])).resolves.toBe(true);
    expect(hasPage).toHaveBeenCalledWith('pt/prefacio', PageType.Chapter);
  });

  it('should await loadRoutes before checking the page', async () => {
    const order: string[] = [];
    loadRoutes.mockImplementation(async () => {
      order.push('load');
    });
    hasPage.mockImplementation(() => {
      order.push('has');
      return true;
    });

    await runGuard(PageType.Chapter, ['pt', 'prefacio']);

    expect(order).toEqual(['load', 'has']);
  });

  it('should not match an unknown slug, an unknown language or the wrong type', async () => {
    await expect(runGuard(PageType.Chapter, ['pt', 'nao-existe'])).resolves.toBe(false);
    await expect(runGuard(PageType.Home, ['xx'])).resolves.toBe(false);
    await expect(runGuard(PageType.Exit, ['pt', 'prefacio'])).resolves.toBe(false);
  });
});
