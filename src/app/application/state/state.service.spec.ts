import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { PageType } from '../../domain/models/page-type.enum';
import { BookService } from '../../infrastructure/services/book.service';
import { I18nService } from '../../infrastructure/services/i18n.service';
import {
  BOOK_NAVIGATION_FIXTURES,
  CHAPTER_PAGINATION_FIXTURES,
  createBookPaginationDeps,
  STATE_SERVICE_FIXTURES
} from '../../../mocks/book-navigation.mock';
import { type ChapterEstimator, StateService } from './state.service';

@Component({
  selector: 'website-state-route-stub',
  standalone: true,
  template: ''
})
class StateRouteStubComponent {}

const {
  enRoutes,
  enPrefacePath,
  enChapterPath,
  enChapterUrl,
  enChapterLang,
  ptCoverLang,
  prefaceSlug,
  chapterOneSlug,
  prefacePageCount,
  chapterOnePageCount
} = STATE_SERVICE_FIXTURES;

describe('StateService', () => {
  let stateService: StateService;
  let bookService: BookService;
  let i18n: I18nService;
  let router: Router;

  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers();
    document.cookie = 'ibid-lang=; path=/; max-age=0';
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: enChapterPath,
            component: StateRouteStubComponent,
            data: { type: PageType.Chapter, lang: enChapterLang }
          }
        ])
      ]
    });
    bookService = TestBed.inject(BookService);
    i18n = TestBed.inject(I18nService);
    router = TestBed.inject(Router);
    stateService = TestBed.inject(StateService);
    bookService.setRouteOrder([...BOOK_NAVIGATION_FIXTURES.routes]);
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.useRealTimers();
    document.cookie = 'ibid-lang=; path=/; max-age=0';
    TestBed.resetTestingModule();
  });

  it('should update currentState page numbers and approachingCover reactively when chapter page counts update', () => {
    bookService.activePageType.set(PageType.Chapter);
    bookService.activeChapterSlug.set(chapterOneSlug);
    bookService.currentChapterPage.set(1);

    expect(stateService.currentState().page).toBe(2);
    expect(stateService.currentState().leftPage).toBe(1);
    expect(stateService.currentState().rightPage).toBe(2);

    bookService.setPageCount(prefaceSlug, prefacePageCount);

    stateService.isDesktop.set(false);
    expect(stateService.currentState().page).toBe(prefacePageCount + 1);
    bookService.currentChapterPage.set(2);
    expect(stateService.currentState().page).toBe(prefacePageCount + 2);

    stateService.isDesktop.set(true);
    bookService.currentChapterPage.set(1);
    expect(stateService.currentState().page).toBe(prefacePageCount + 1);
    expect(stateService.currentState().leftPage).toBe(prefacePageCount + 1);
    expect(stateService.currentState().rightPage).toBe(prefacePageCount + 2);

    bookService.currentChapterPage.set(3);
    expect(stateService.currentState().page).toBe(prefacePageCount + 3);
    expect(stateService.currentState().leftPage).toBe(prefacePageCount + 3);
    expect(stateService.currentState().rightPage).toBe(prefacePageCount + 4);

    bookService.currentChapterPage.set(chapterOnePageCount);
    expect(stateService.approachingCover()).toBe(false);

    bookService.setPageCount(chapterOneSlug, chapterOnePageCount);
    expect(stateService.approachingCover()).toBe(true);
    expect(stateService.currentState().isGoingToCover).toBe(true);

    bookService.activeChapterSlug.set(prefaceSlug);
    bookService.currentChapterPage.set(1);
    expect(stateService.approachingCover()).toBe(true);
  });

  it('should sync active chapter, page type, and language from route data on direct load', async () => {
    i18n.setLanguage(ptCoverLang);
    bookService.setRouteOrder([...enRoutes]);
    bookService.setPageCount(enPrefacePath, prefacePageCount);
    stateService.isDesktop.set(true);

    await router.navigateByUrl(enChapterUrl);
    TestBed.flushEffects();

    expect(bookService.activeChapterSlug()).toBe(enChapterPath);
    expect(bookService.activePageType()).toBe(PageType.Chapter);
    expect(i18n.currentLangCode()).toBe(enChapterLang);
    expect(stateService.prevLink()).toBe(`/${enPrefacePath}`);
    expect(stateService.nextLink()).toBe('/en/exit');
    expect(stateService.currentState().lang).toBe(enChapterLang);
    expect(stateService.currentState().page).toBe(prefacePageCount + 1);
    expect(stateService.currentState().leftPage).toBe(prefacePageCount + 1);
    expect(stateService.currentState().rightPage).toBe(prefacePageCount + 2);
  });

  it('should release isTransitioning on navigateWithFlip resolve, reject, cancelScheduledNavigation, NavigationEnd, and ngOnDestroy', async () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    navigateSpy.mockResolvedValueOnce(true);

    stateService.navigateWithFlip(enChapterUrl, 1, { state: { turnDirection: 1 } });
    expect(stateService.isTransitioning()).toBe(true);
    expect(bookService.isFlipping()).toBe(true);
    expect(bookService.flipDirection()).toBe(1);

    await vi.advanceTimersByTimeAsync(BOOK_NAVIGATION_FIXTURES.navigationDelayMs);
    expect(navigateSpy).toHaveBeenCalledWith([enChapterUrl], { state: { turnDirection: 1 } });
    expect(stateService.isTransitioning()).toBe(false);

    navigateSpy.mockRejectedValueOnce(new Error('navigation failed'));
    stateService.navigateWithFlip(enChapterUrl, -1);
    expect(stateService.isTransitioning()).toBe(true);
    expect(bookService.flipDirection()).toBe(-1);

    await vi.advanceTimersByTimeAsync(BOOK_NAVIGATION_FIXTURES.navigationDelayMs);
    expect(stateService.isTransitioning()).toBe(false);

    navigateSpy.mockClear();
    stateService.navigateWithFlip(enChapterUrl, 1);
    expect(stateService.isTransitioning()).toBe(true);
    stateService.cancelScheduledNavigation();
    expect(stateService.isTransitioning()).toBe(false);
    await vi.advanceTimersByTimeAsync(BOOK_NAVIGATION_FIXTURES.navigationDelayMs);
    expect(navigateSpy).not.toHaveBeenCalled();

    stateService.navigateWithFlip(enChapterUrl, 1);
    expect(stateService.isTransitioning()).toBe(true);
    await router.navigateByUrl(enChapterUrl);
    expect(stateService.isTransitioning()).toBe(false);

    stateService.navigateWithFlip(enChapterUrl, 1);
    expect(stateService.isTransitioning()).toBe(true);
    stateService.ngOnDestroy();
    expect(stateService.isTransitioning()).toBe(false);
  });

  it('should resolve slugs, track desktop cover stage, and delegate chapter page sync and measurement', async () => {
    expect(stateService.resolveSlugFromUrl('/')).toBe('');
    expect(stateService.resolveSlugFromUrl(`/${enChapterPath}/?p=2#top`)).toBe(enChapterPath);

    stateService.isDesktop.set(true);
    bookService.activePageType.set(PageType.Home);
    expect(stateService.isDesktopCoverStage()).toBe(true);
    bookService.activePageType.set(PageType.Chapter);
    expect(stateService.isDesktopCoverStage()).toBe(false);

    const host = document.createElement('div');
    Object.defineProperty(host, 'clientWidth', {
      value: CHAPTER_PAGINATION_FIXTURES.desktopViewport.width - 15,
      configurable: true
    });
    Object.defineProperty(host, 'clientHeight', {
      value: CHAPTER_PAGINATION_FIXTURES.desktopViewport.height - 15,
      configurable: true
    });
    const deps = createBookPaginationDeps(true);
    const estimator = vi.fn<ChapterEstimator>(() => 5);
    const getPage = vi.spyOn(deps.contentRepo, 'getPage');

    deps.bookService.setPageCount('pt/first', 8);
    stateService.recordMeasuredChapterPage(host, deps, { slug: 'pt/first', totalCols: 8 });

    const syncPromise = stateService.syncAllChapterPageCounts(host, deps, estimator);
    expect(getPage).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(CHAPTER_PAGINATION_FIXTURES.syncTimerMs);
    await syncPromise;

    expect(getPage.mock.calls).toEqual([
      ['pt/first', { priority: 'low' }],
      ['pt/second', { priority: 'low' }]
    ]);

    expect(estimator).toHaveBeenCalledTimes(2);
    expect(deps.bookService.getChapterPages('pt/first')).toBe(8);
    expect(deps.bookService.getChapterPages('pt/second')).toBe(5);
    expect(deps.bookService.getChapterPages('pt/current')).toBe(5);
  });
});
