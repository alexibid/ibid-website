import { inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  withComponentInputBinding
} from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { RoutingService } from './infrastructure/services/routing.service';
import { PageType } from './domain/models/page-type.enum';
import { ContactFacade } from './application/facades/contact.facade';
import { StateService } from './application/state/state.service';
import { I18nService } from './infrastructure/services/i18n.service';
import { MetaService } from './infrastructure/services/meta.service';
import { CONTENT_READ_REPOSITORY } from './infrastructure/tokens/content-repository.token';
import {
  createPublishedBookRepository,
  PUBLIC_NAVIGATION_FIXTURES,
  PUBLISHED_BOOK
} from '../mocks/app-routes.mock';
import { createMockContactFacade } from '../mocks/contact-facade.mock';

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

describe('published book', () => {
  async function openBook(): Promise<RouterTestingHarness> {
    const harness = await RouterTestingHarness.create();
    TestBed.inject(StateService);
    TestBed.inject(MetaService).init();
    return harness;
  }

  async function visit(harness: RouterTestingHarness, url: string): Promise<HTMLElement> {
    await harness.navigateByUrl(url);
    await harness.fixture.whenStable();
    harness.detectChanges();
    const root: unknown = harness.fixture.nativeElement;
    if (!(root instanceof HTMLElement)) throw new Error('Book root is not an HTMLElement');
    return root;
  }

  function headingsOf(root: HTMLElement): readonly string[] {
    return Array.from(root.querySelectorAll('h1'), (heading) => heading.textContent ?? '');
  }

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        { provide: CONTENT_READ_REPOSITORY, useValue: createPublishedBookRepository() },
        { provide: ContactFacade, useFactory: () => createMockContactFacade(inject(I18nService)) }
      ]
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    sessionStorage.clear();
    document.cookie = 'ibid-lang=; path=/; max-age=0';
    TestBed.resetTestingModule();
  });

  it('should open every public page at /<lang>/<slug> or at the language home /<lang>', async () => {
    const router = TestBed.inject(Router);

    for (const { url } of PUBLISHED_BOOK.documentTitles) {
      await router.navigateByUrl(url);

      expect(router.url).toBe(url);
      expect(matchedPaths(router)).not.toContain('**');
    }
  });

  it('should show the not-found page for an unknown slug under a valid language', async () => {
    const router = TestBed.inject(Router);

    await router.navigateByUrl(PUBLISHED_BOOK.unknownUrl);

    expect(router.url).toBe(PUBLISHED_BOOK.unknownUrl);
    expect(matchedPaths(router)).toContain('**');
  });

  it('should title every tab as brand then page title, with the product name first on product pages', async () => {
    const router = TestBed.inject(Router);
    TestBed.inject(MetaService).init();

    for (const { url, title } of PUBLISHED_BOOK.documentTitles) {
      await router.navigateByUrl(url);

      expect(document.title).toBe(title);
    }
  });

  it('should show one main heading per page that carries the same keyword as the page title', async () => {
    const harness = await openBook();
    const pages = [
      { url: PUBLISHED_BOOK.homeUrl, keyword: PUBLISHED_BOOK.coverTitle },
      { url: PUBLISHED_BOOK.indexUrl, keyword: PUBLISHED_BOOK.indexTitle },
      { url: PUBLISHED_BOOK.chapterUrl, keyword: PUBLISHED_BOOK.chapterTitle }
    ];

    for (const { url, keyword } of pages) {
      const headings = headingsOf(await visit(harness, url));

      expect(headings).toHaveLength(1);
      expect(headings[0]).toContain(keyword);
      expect(document.title).toContain(keyword);
    }
    expect(headingsOf(await visit(harness, PUBLISHED_BOOK.exitUrl))).toHaveLength(1);
  });

  it('should show the index by itself 5 seconds after opening its address, not on the language home', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const harness = await openBook();
    const isCoverOpen = (root: HTMLElement): boolean =>
      root.querySelector('website-cover-motion')?.classList.contains('cover-motion--open') ?? false;
    const wait = async (milliseconds: number): Promise<void> => {
      await vi.advanceTimersByTimeAsync(milliseconds);
      harness.detectChanges();
    };

    const home = await visit(harness, PUBLISHED_BOOK.homeUrl);
    await wait(PUBLISHED_BOOK.indexRevealDelayMs);
    expect(isCoverOpen(home)).toBe(false);

    const index = await visit(harness, PUBLISHED_BOOK.indexUrl);
    await wait(PUBLISHED_BOOK.indexRevealDelayMs - 1);
    expect(isCoverOpen(index)).toBe(false);
    await wait(1);
    expect(isCoverOpen(index)).toBe(true);
  });
});
