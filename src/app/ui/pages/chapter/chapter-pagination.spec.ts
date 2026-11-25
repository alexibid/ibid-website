import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { StateService } from '../../../application/state/state.service';
import { PageType } from '../../../domain/models/page-type.enum';
import { BookService } from '../../../infrastructure/services/book.service';
import { RoutingService } from '../../../infrastructure/services/routing.service';
import { CONTENT_READ_REPOSITORY } from '../../../infrastructure/tokens/content-repository.token';
import {
  CHAPTER_PAGINATION_FIXTURES,
  createActivatedRouteMock,
  createChapterPaginationContentRepoMock,
  createChapterRouterMock,
  createRoutingServiceMock
} from '../../../../mocks/book-navigation.mock';
import { BookNavigationDirective } from '../../directives/book-navigation.directive';
import { Chapter } from './chapter';

const {
  routes,
  currentUrl,
  currentSlug,
  precedingSlugs,
  chapterInput,
  desktopViewport,
  mobileViewport,
  measuredPages,
  landingDelayMs,
  syncTimerMs,
  precedingRows,
  turnBackState
} = CHAPTER_PAGINATION_FIXTURES;

describe('Chapter pagination', () => {
  let fixture: ComponentFixture<Chapter>;
  let router: ReturnType<typeof createChapterRouterMock>;
  let stateService: StateService;
  let bookService: BookService;
  let nav: BookNavigationDirective;
  let scrollTo: ReturnType<typeof vi.fn>;
  let scrollLeftValue: number;

  function configureHostViewport(viewport: { width: number; height: number; scrollWidth: number }): void {
    Object.defineProperty(nav.hostEl, 'clientWidth', { value: viewport.width, configurable: true });
    Object.defineProperty(nav.hostEl, 'clientHeight', { value: viewport.height, configurable: true });
    Object.defineProperty(nav.hostEl, 'scrollWidth', { value: viewport.scrollWidth, configurable: true });
  }

  beforeEach(async () => {
    sessionStorage.clear();
    scrollLeftValue = 0;
    router = createChapterRouterMock(currentUrl);
    await TestBed.configureTestingModule({
      imports: [Chapter],
      providers: [
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: createActivatedRouteMock({ type: PageType.Chapter, lang: 'pt' }) },
        { provide: RoutingService, useValue: createRoutingServiceMock(routes) },
        { provide: CONTENT_READ_REPOSITORY, useValue: createChapterPaginationContentRepoMock() }
      ]
    }).compileComponents();
    vi.useFakeTimers();
    stateService = TestBed.inject(StateService);
    bookService = TestBed.inject(BookService);
    bookService.setRouteOrder([...routes]);
    bookService.activePageType.set(PageType.Chapter);
    fixture = TestBed.createComponent(Chapter);
    nav = fixture.debugElement.injector.get(BookNavigationDirective);
    scrollTo = vi.fn((options?: ScrollToOptions) => {
      const maxScroll = Math.max(0, nav.hostEl.scrollWidth - nav.hostEl.clientWidth);
      const rawLeft = options?.left ?? 0;
      scrollLeftValue = Math.max(0, Math.min(rawLeft, maxScroll));
    });
    Object.defineProperty(nav.hostEl, 'scrollLeft', {
      get: () => scrollLeftValue,
      set: (value: number) => {
        scrollLeftValue = value;
      },
      configurable: true
    });
    Object.defineProperty(nav.hostEl, 'scrollTo', { value: scrollTo, configurable: true });
    configureHostViewport(desktopViewport);
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  async function renderChapter(isDesktop: boolean): Promise<void> {
    stateService.isDesktop.set(isDesktop);
    configureHostViewport(isDesktop ? desktopViewport : mobileViewport);
    Object.entries(chapterInput).forEach(([name, value]) => fixture.componentRef.setInput(name, value));
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(landingDelayMs);
    await vi.advanceTimersByTimeAsync(syncTimerMs);
    await Promise.resolve();
    fixture.detectChanges();
  }

  it.each(precedingRows)(
    'should count the pages of every preceding chapter so a direct load numbers pages like a forward walk (desktop: $isDesktop)',
    async ({ isDesktop, minPages }) => {
      await renderChapter(isDesktop);

      const precedingCounts = precedingSlugs.map(slug => bookService.getChapterPages(slug));
      const expectedStart = 1 + precedingCounts.reduce((sum, count) => sum + count, 0);
      const currentFooter = stateService.currentState();

      precedingCounts.forEach(count => expect(count).toBeGreaterThanOrEqual(minPages));
      expect(bookService.getStartingPage(currentSlug)).toBe(expectedStart);
      expect(bookService.getChapterPages(currentSlug)).toBe(measuredPages);
      expect(currentFooter.page).toBe(expectedStart);
      if (isDesktop) {
        expect(currentFooter.leftPage).toBe(expectedStart);
        expect(currentFooter.rightPage).toBe(expectedStart + 1);
      }
    }
  );

  it.each(precedingRows)(
    'should land on the last page with continuous footer page numbers when the chapter is reached by turning back (desktop: $isDesktop)',
    async ({ isDesktop }) => {
      const viewport = isDesktop ? desktopViewport : mobileViewport;
      router.lastSuccessfulNavigation.set(turnBackState);
      await renderChapter(isDesktop);

      const expectedStart = 1 + precedingSlugs.reduce((sum, slug) => sum + bookService.getChapterPages(slug), 0);
      const currentFooter = stateService.currentState();
      const expectedPageInChapter = isDesktop ? measuredPages - 1 : measuredPages;

      expect(scrollTo).toHaveBeenLastCalledWith({ left: viewport.scrollWidth, behavior: 'instant' });
      expect(bookService.currentChapterPage()).toBe(expectedPageInChapter);
      expect(currentFooter.page).toBe(expectedStart + expectedPageInChapter - 1);
      if (isDesktop) {
        expect(currentFooter.leftPage).toBe(expectedStart + measuredPages - 2);
        expect(currentFooter.rightPage).toBe(expectedStart + measuredPages - 1);
      }
    }
  );
});
