import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RoutingService } from './routing.service';
import { UiErrorService } from './ui-error.service';
import { CONTENT_READ_REPOSITORY } from '../tokens/content-repository.token';
import { PageType } from '../../domain/models/page-type.enum';
import {
  ALL_SUPPORTED_LANGUAGE_CODES,
  createMockContentReadRepository,
  MOCK_EMPTY_URLS,
  MOCK_I18N_PAGES
} from '../../../mocks/i18n.mock';
import {
  CMS_ROUTE_EXPECTATIONS,
  CMS_ROUTE_FAILURES,
  CMS_ROUTE_RECORDS,
  createCmsRouteRepository
} from '../../../mocks/cms-route.mock';

function configure(repository: unknown): RoutingService {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), { provide: CONTENT_READ_REPOSITORY, useValue: repository }]
  });
  return TestBed.inject(RoutingService);
}

describe('RoutingService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('should never rebuild the router configuration while running', async () => {
    const routingService = configure(createMockContentReadRepository());
    const resetConfig = vi.spyOn(TestBed.inject(Router), 'resetConfig');

    await routingService.loadRoutes();
    await routingService.refreshRoutes();

    expect(resetConfig).not.toHaveBeenCalled();
  });

  it('should answer hasPage by path and type, and reject unknown paths and wrong types', async () => {
    const routingService = configure(createMockContentReadRepository());

    await routingService.loadRoutes();

    expect(routingService.hasPage('de/vorwort', PageType.Chapter)).toBe(true);
    expect(routingService.hasPage('fr', PageType.Home)).toBe(true);
    expect(routingService.hasPage('de/vorwort', PageType.Exit)).toBe(false);
    expect(routingService.hasPage(CMS_ROUTE_EXPECTATIONS.unknownKey, PageType.Chapter)).toBe(false);
    expect(routingService.hasPage('admin', PageType.Chapter)).toBe(false);
  });

  it('should return page data with getPage and throw for an unknown path', async () => {
    const routingService = configure(createMockContentReadRepository());

    await routingService.loadRoutes();

    expect(routingService.getPage('de/vorwort').title).toBe('Vorwort');
    expect(() => routingService.getPage(CMS_ROUTE_EXPECTATIONS.unknownKey)).toThrow();
  });

  it('should fetch once for repeated and concurrent loadRoutes calls', async () => {
    const repository = createCmsRouteRepository(CMS_ROUTE_RECORDS.pt);
    const routingService = configure(repository);

    await Promise.all([routingService.loadRoutes(), routingService.loadRoutes()]);
    await routingService.loadRoutes();

    expect(repository.getUrls).toHaveBeenCalledTimes(1);
  });

  it('should refetch on every refreshRoutes and show the new content right away', async () => {
    const repository = createCmsRouteRepository(CMS_ROUTE_RECORDS.pt);
    repository.getUrls
      .mockResolvedValueOnce(CMS_ROUTE_RECORDS.pt)
      .mockResolvedValueOnce(CMS_ROUTE_RECORDS.ptAndEn);
    const routingService = configure(repository);

    await routingService.loadRoutes();
    expect(routingService.hasPage(CMS_ROUTE_EXPECTATIONS.prefaceEnKey, PageType.Chapter)).toBe(false);

    await routingService.refreshRoutes();

    expect(repository.getUrls).toHaveBeenCalledTimes(2);
    expect(routingService.hasPage(CMS_ROUTE_EXPECTATIONS.prefaceEnKey, PageType.Chapter)).toBe(true);
  });

  it('should list prerender params for the language homes and every page', async () => {
    const routingService = configure(createMockContentReadRepository());

    const params = await routingService.listRouteParams();

    expect(params).toContainEqual({ lang: 'de', slug: '' });
    expect(params).toContainEqual({ lang: 'de', slug: 'vorwort' });
    expect(params).toContainEqual({ lang: 'pt', slug: 'prefacio' });
    for (const lang of ALL_SUPPORTED_LANGUAGE_CODES) {
      expect(params).toContainEqual({ lang, slug: '' });
    }
  });

  it('should handle an empty URL list without throwing and keep an empty table', async () => {
    const routingService = configure(
      createMockContentReadRepository(MOCK_I18N_PAGES, MOCK_EMPTY_URLS)
    );

    await expect(routingService.loadRoutes()).resolves.toBeUndefined();

    expect(routingService.translationMap.size).toBe(0);
    expect(routingService.hasPage('pt', PageType.Home)).toBe(false);
    await expect(routingService.listRouteParams()).resolves.toEqual([]);
  });

  it('should show error-network and resolve when the fetch fails with status 0', async () => {
    const repository = createCmsRouteRepository(CMS_ROUTE_RECORDS.pt);
    repository.getUrls.mockRejectedValue(CMS_ROUTE_FAILURES.network);
    const routingService = configure(repository);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(routingService.loadRoutes()).resolves.toBeUndefined();

    expect(TestBed.inject(UiErrorService).currentError()).toBe('error-network');
    expect(routingService.translationMap.size).toBe(0);
  });

  it('should show error-network when the fetch is aborted', async () => {
    const repository = createCmsRouteRepository(CMS_ROUTE_RECORDS.pt);
    repository.getUrls.mockRejectedValue(CMS_ROUTE_FAILURES.abort);
    const routingService = configure(repository);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await routingService.refreshRoutes();

    expect(TestBed.inject(UiErrorService).currentError()).toBe('error-network');
  });

  it('should show error-generic and resolve for any other failure', async () => {
    const repository = createCmsRouteRepository(CMS_ROUTE_RECORDS.pt);
    repository.getUrls.mockRejectedValue(CMS_ROUTE_FAILURES.server);
    const routingService = configure(repository);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(routingService.refreshRoutes()).resolves.toBeUndefined();

    expect(TestBed.inject(UiErrorService).currentError()).toBe('error-generic');
  });
});
