import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, UrlSegment } from '@angular/router';
import { CMS_ROUTE_DATA_RESOLVERS } from './cms-route-data.resolver';
import { RoutingService } from '../services/routing.service';
import { CmsRouteData } from '../../domain/models/cms.interface';
import { RESOLVER_PAGES } from '../../../mocks/cms-route-resolver.mock';

function snapshotFor(...paths: string[]): ActivatedRouteSnapshot {
  const snapshot = new ActivatedRouteSnapshot();
  snapshot.url = paths.map((path) => new UrlSegment(path, {}));
  return snapshot;
}

function resolveField(field: string, snapshot: ActivatedRouteSnapshot): unknown {
  const resolver = Reflect.get(CMS_ROUTE_DATA_RESOLVERS, field);
  return TestBed.runInInjectionContext(() =>
    resolver(snapshot, TestBed.inject(Router).routerState.snapshot)
  );
}

describe('CMS_ROUTE_DATA_RESOLVERS', () => {
  let getPage: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getPage = vi.fn((path: string): CmsRouteData => {
      const page = RESOLVER_PAGES.byPath[path];
      if (!page) {
        throw new Error(`Unknown page: ${path}`);
      }
      return page;
    });
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: RoutingService, useValue: { getPage } }]
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('should resolve each field from the page found by the joined url', () => {
    const snapshot = snapshotFor('pt', 'prefacio');
    const expected = RESOLVER_PAGES.byPath['pt/prefacio'];

    expect(resolveField('pageId', snapshot)).toBe(expected.pageId);
    expect(resolveField('title', snapshot)).toBe(expected.title);
    expect(resolveField('lang', snapshot)).toBe(expected.lang);
    expect(resolveField('type', snapshot)).toBe(expected.type);
    expect(resolveField('content', snapshot)).toBe(expected.content);
    expect(resolveField('metadata', snapshot)).toEqual(expected.metadata);
    expect(resolveField('location', snapshot)).toBe(expected.location);
    expect(getPage).toHaveBeenCalledWith('pt/prefacio');
  });

  it('should default location to an empty string and metadata to the location', () => {
    const snapshot = snapshotFor('pt', 'sem-localizacao');

    expect(resolveField('location', snapshot)).toBe('');
    expect(resolveField('metadata', snapshot)).toEqual({ location: '' });
  });

  it('should propagate the error for an unknown page', () => {
    expect(() => resolveField('title', snapshotFor('pt', 'nao-existe'))).toThrow();
  });
});
