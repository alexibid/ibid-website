import { Injector, PLATFORM_ID, signal } from '@angular/core';
import type { NavigationExtras } from '@angular/router';
import { Subject, of } from 'rxjs';
import { vi } from 'vitest';
import type { CmsPage } from '../app/domain/models/cms.interface';
import { PageType } from '../app/domain/models/page-type.enum';
import type { BookPaginationDeps } from '../app/application/state/state.service';
import { BookService } from '../app/infrastructure/services/book.service';
import { RoutingService } from '../app/infrastructure/services/routing.service';

export const BOOK_NAVIGATION_FIXTURES = {
  routes: [
    { slug: '', title: 'Cover', type: PageType.Home },
    { slug: 'preface', title: 'Preface', type: PageType.Chapter },
    { slug: 'chapter-one', title: 'Chapter One', type: PageType.Chapter },
    { slug: 'exit', title: 'Exit', type: PageType.Exit }
  ],
  viewportWidth: 400,
  scrollWidth: 1200,
  desktopViewportWidth: 800,
  desktopScrollWidth: 2400,
  desktopHomeScrollWidth: 1600,
  navigationDelayMs: 450,
  scrollLockMs: 500,
  anchorId: 'section-anchor',
  anchorOffsetLeft: 800,
  anchorDelayMs: 100,
  remeasureDelayMs: 50,
  unbalancedScrollWidth: 1000
} as const;

export interface HostElementMock {
  scrollLeft: number;
  clientWidth: number;
  clientHeight: number;
  scrollWidth: number;
  scrollBy: (options: ScrollToOptions) => void;
  scrollTo: (options: ScrollToOptions) => void;
}

export function createHostElementMock(scrollLeft: number): HostElementMock {
  const host: HostElementMock = {
    scrollLeft,
    clientWidth: BOOK_NAVIGATION_FIXTURES.viewportWidth,
    clientHeight: 740,
    scrollWidth: BOOK_NAVIGATION_FIXTURES.scrollWidth,
    scrollBy: vi.fn((options: ScrollToOptions) => { host.scrollLeft += options.left ?? 0; }),
    scrollTo: vi.fn((options: ScrollToOptions) => { host.scrollLeft = options.left ?? 0; })
  };
  return host;
}

export type RouterOutcome = 'resolve' | 'reject' | 'pending';

export interface NavigationStateMock {
  readonly extras: { readonly state?: Readonly<Record<string, unknown>> };
}

export function createRouterMock(url: string, outcome: RouterOutcome) {
  const navigateResult = (): Promise<boolean> => {
    if (outcome === 'resolve') return Promise.resolve(true);
    if (outcome === 'pending') return new Promise<boolean>(() => undefined);
    return Promise.reject<boolean>(new Error('navigation failed'));
  };
  return {
    url,
    events: new Subject<unknown>(),
    navigate: vi.fn((_commands: unknown[], _extras?: NavigationExtras) => navigateResult()),
    lastSuccessfulNavigation: signal<NavigationStateMock | null>(null)
  };
}

export function createActivatedRouteMock(data: Readonly<Record<string, unknown>> = {}) {
  return { data: of(data), fragment: new Subject<string | null>(), snapshot: { data } };
}

export function createStateServiceMock(isDesktop: boolean, router?: ReturnType<typeof createRouterMock>) {
  const isTransitioning = signal(false);
  let navigationTimer: ReturnType<typeof setTimeout> | undefined;
  const type: PageType | null = PageType.Chapter;
  const adminLang: string | null = null;
  const adminAction: string | null = null;
  const cancelScheduledNavigation = vi.fn(() => {
    clearTimeout(navigationTimer);
    navigationTimer = undefined;
    isTransitioning.set(false);
  });
  const navigateWithFlip = vi.fn((targetUrl: string, _direction: number, extras?: NavigationExtras) => {
    clearTimeout(navigationTimer);
    isTransitioning.set(true);
    navigationTimer = setTimeout(() => {
      navigationTimer = undefined;
      const nav = router ? (extras ? router.navigate([targetUrl], extras) : router.navigate([targetUrl])) : Promise.resolve(true);
      void Promise.resolve(nav).catch(() => false).finally(() => isTransitioning.set(false));
    }, BOOK_NAVIGATION_FIXTURES.navigationDelayMs);
  });
  return {
    isBrowser: true,
    isDesktop: signal(isDesktop),
    isTransitioning,
    isDesktopCoverStage: signal(false),
    prevLink: signal<string | null>(null),
    nextLink: signal<string | null>(null),
    resolveSlugFromUrl: (rawUrl: string) => rawUrl.split(/[?#]/)[0].replace(/^\/+|\/+$/g, ''),
    cancelScheduledNavigation,
    navigateWithFlip,
    currentState: signal({
      page: 0, rightPage: 0, leftPage: 0, pageInChapter: 1,
      slug: '', lang: 'pt', type, isAdmin: false, adminLang, adminAction,
      isOnCover: false, isGoingToCover: false
    })
  };
}

export function createBookNavigationHarness(url: string, scrollLeft: number, outcome: RouterOutcome) {
  const router = createRouterMock(url, outcome);
  return {
    host: createHostElementMock(scrollLeft),
    router,
    stateService: createStateServiceMock(false, router),
    activatedRoute: createActivatedRouteMock()
  };
}

export type BookNavigationHarness = ReturnType<typeof createBookNavigationHarness>;

export const TURN_FORWARD_NAVIGATION_STATE: NavigationStateMock = { extras: { state: { turnDirection: 1 } } };
export const TURN_BACK_NAVIGATION_STATE: NavigationStateMock = { extras: { state: { turnDirection: -1 } } };

export const BOOK_NAVIGATION_SCENARIOS = {
  forwardBoundaryRows: [
    {
      label: 'chapter last page to next chapter', url: '/preface', pageType: PageType.Chapter, isDesktop: false,
      scrollLeft: BOOK_NAVIGATION_FIXTURES.scrollWidth - BOOK_NAVIGATION_FIXTURES.viewportWidth,
      scrollWidth: BOOK_NAVIGATION_FIXTURES.scrollWidth, coverOpen: false, requiresCoverOpen: false, expectedTarget: '/chapter-one'
    },
    {
      label: 'last chapter last page to exit contact page', url: '/chapter-one', pageType: PageType.Chapter, isDesktop: false,
      scrollLeft: BOOK_NAVIGATION_FIXTURES.scrollWidth - BOOK_NAVIGATION_FIXTURES.viewportWidth,
      scrollWidth: BOOK_NAVIGATION_FIXTURES.scrollWidth, coverOpen: false, requiresCoverOpen: false, expectedTarget: '/exit'
    },
    {
      label: 'open desktop cover index to first chapter', url: '/', pageType: PageType.Home, isDesktop: true,
      scrollLeft: BOOK_NAVIGATION_FIXTURES.desktopViewportWidth, scrollWidth: BOOK_NAVIGATION_FIXTURES.desktopHomeScrollWidth,
      coverOpen: true, requiresCoverOpen: false, expectedTarget: '/preface'
    },
    {
      label: 'closed desktop cover opens then advances to first chapter', url: '/', pageType: PageType.Home, isDesktop: true,
      scrollLeft: 0, scrollWidth: BOOK_NAVIGATION_FIXTURES.desktopHomeScrollWidth,
      coverOpen: false, requiresCoverOpen: true, expectedTarget: '/preface'
    }
  ],
  backwardBoundaryRows: [
    { label: 'exit first page to last chapter', url: '/exit', expectedTarget: '/chapter-one', expectedCoverOpen: false },
    { label: 'chapter first page to previous chapter', url: '/chapter-one', expectedTarget: '/preface', expectedCoverOpen: false },
    { label: 'first chapter first page to cover keeping cover open', url: '/preface', expectedTarget: '/', expectedCoverOpen: true }
  ],
  turnForwardState: TURN_FORWARD_NAVIGATION_STATE,
  turnBackState: TURN_BACK_NAVIGATION_STATE
} as const;

const PARAGRAPH_BODY =
  '<p>Alpha bravo charlie delta echo foxtrot golf hotel india juliet kilo lima mike november ' +
  'oscar papa quebec romeo sierra tango uniform victor whiskey xray yankee zulu alpha bravo ' +
  'charlie delta echo foxtrot golf hotel india juliet kilo lima mike november oscar papa quebec ' +
  'romeo sierra tango uniform victor whiskey xray yankee zulu.</p>';

export const MULTI_PARAGRAPH_HTML = PARAGRAPH_BODY.repeat(12);

export const PRECEDING_CHAPTER_PAGE_ROWS = [
  { isDesktop: true, minPages: 3 },
  { isDesktop: false, minPages: 2 }
] as const;

export const CHAPTER_PAGINATION_FIXTURES = {
  routes: [
    { slug: 'pt', title: 'Cover', type: PageType.Home, content: '<p>Cover</p>' },
    { slug: 'pt/first', title: 'First', type: PageType.Chapter, content: '' },
    { slug: 'pt/second', title: 'Second', type: PageType.Chapter, content: '' },
    { slug: 'pt/current', title: 'Current', type: PageType.Chapter, content: '<p>Current chapter</p>' },
    { slug: 'pt/contactos', title: 'Contact', type: PageType.Exit, content: '<p>Contact</p>' }
  ],
  currentUrl: '/pt/current',
  currentSlug: 'pt/current',
  precedingSlugs: ['pt/first', 'pt/second'],
  chapterInput: {
    pageId: 'chapter-current', title: 'Current', lang: 'pt', type: PageType.Chapter,
    content: '<p>Current chapter</p>', metadata: { location: 'III' }, location: 'III'
  },
  desktopViewport: { width: 1000, height: 765, scrollWidth: 3000 },
  mobileViewport: { width: 380, height: 740, scrollWidth: 2280 },
  footerCacheViewport: { width: 920, height: 720 },
  coldReloadViewport: { width: 845, height: 695 },
  coldReloadCounts: { 'pt/first': 5, 'pt/second': 6, 'pt/current': 8 },
  measuredPages: 6,
  landingDelayMs: 100,
  syncTimerMs: 300,
  precedingRows: PRECEDING_CHAPTER_PAGE_ROWS,
  turnBackState: TURN_BACK_NAVIGATION_STATE,
  coldReloadStorageKey: createColdReloadStorageKey
} as const;

export function createColdReloadStorageKey(
  viewport: { readonly width: number; readonly height: number },
  isDesktop: boolean
): string {
  const loaded = document.fonts?.status === 'loaded' ? 'f1' : 'f0';
  const sig = CHAPTER_PAGINATION_FIXTURES.routes
    .filter(route => route.type === PageType.Chapter)
    .map(route => `${route.slug}:${route.slug}:${route.title.length}:${route.content.length}`)
    .join('|');
  return `ibid-pages:${viewport.width}x${viewport.height}:${isDesktop}:${loaded}:${sig}`;
}

export function createRoutingServiceMock(pages: readonly { slug: string; title: string; type: PageType; content?: string }[]) {
  const byPath = new Map(pages.map(page => [page.slug, page]));
  return {
    hasPage: vi.fn((path: string, type: PageType) => byPath.get(path)?.type === type),
    getPage: vi.fn((path: string) => {
      const page = byPath.get(path);
      if (!page) throw new Error(`Unknown CMS page: ${path}`);
      return { pageId: path, title: page.title, lang: 'pt', type: page.type, content: page.content ?? `<p>${page.title}</p>` };
    })
  };
}

export function createChapterPaginationContentRepoMock() {
  const byId = new Map<string, CmsPage>(
    CHAPTER_PAGINATION_FIXTURES.routes.map(route => [
      route.slug,
      { id: route.slug, title: route.title, content: route.content || MULTI_PARAGRAPH_HTML, type: route.type, lang: 'pt', metadata: {} }
    ])
  );
  return {
    loadSections: vi.fn(async () => [] as CmsPage[]),
    getUrls: vi.fn(async () => []),
    getPages: vi.fn(async () => Array.from(byId.values())),
    getPage: vi.fn(async (id: string) => {
      const page = byId.get(id);
      if (!page) throw new Error(`Page not found: ${id}`);
      return page;
    })
  };
}

export function createBookPaginationDeps(isDesktop: boolean): BookPaginationDeps {
  const injector = Injector.create({
    providers: [
      { provide: PLATFORM_ID, useValue: 'browser' },
      { provide: BookService, useClass: BookService },
      { provide: RoutingService, useValue: createRoutingServiceMock(CHAPTER_PAGINATION_FIXTURES.routes) }
    ]
  });
  const bookService = injector.get(BookService);
  bookService.setRouteOrder([...CHAPTER_PAGINATION_FIXTURES.routes]);
  return {
    bookService,
    routingService: injector.get(RoutingService),
    contentRepo: createChapterPaginationContentRepoMock(),
    isDesktop
  };
}

export function createChapterRouterMock(url: string) {
  return createRouterMock(url, 'resolve');
}

export const STATE_SERVICE_FIXTURES = {
  enRoutes: [
    { slug: 'en', title: 'Cover', type: PageType.Home },
    { slug: 'en/preface', title: 'Preface', type: PageType.Chapter },
    { slug: 'en/chapter-one', title: 'Chapter One', type: PageType.Chapter },
    { slug: 'en/exit', title: 'Exit', type: PageType.Exit }
  ],
  enPrefacePath: 'en/preface',
  enChapterPath: 'en/chapter-one',
  enChapterUrl: '/en/chapter-one',
  enChapterLang: 'en',
  ptCoverLang: 'pt',
  prefaceSlug: 'preface',
  chapterOneSlug: 'chapter-one',
  prefacePageCount: 4,
  chapterOnePageCount: 4
} as const;
