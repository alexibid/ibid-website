import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { CoverMotionState } from '../../../../application/state/cover-motion.state';
import { StateService } from '../../../../application/state/state.service';
import { PageType } from '../../../../domain/models/page-type.enum';
import { BookService } from '../../../../infrastructure/services/book.service';
import {
  BOOK_NAVIGATION_FIXTURES,
  CHAPTER_PAGINATION_FIXTURES,
  createBookPaginationDeps,
  createRouterMock
} from '../../../../../mocks/book-navigation.mock';
import { PageTurn } from '../page-turn/page-turn';
import {
  Footer,
  recordMeasuredChapterPage,
  syncAllChapterPageCounts,
  type BookPaginationDeps,
  type ChapterEstimator
} from './footer';

function queryFooterEl(fixture: ComponentFixture<Footer>, selector: string): HTMLElement | null {
  const root = fixture.nativeElement;
  if (!(root instanceof HTMLElement)) {
    throw new Error('Footer nativeElement is not an HTMLElement');
  }
  const el = root.querySelector(selector);
  return el instanceof HTMLElement ? el : null;
}

function queryButton(fixture: ComponentFixture<Footer>, selector: string): HTMLButtonElement {
  const el = queryFooterEl(fixture, selector);
  if (!(el instanceof HTMLButtonElement)) {
    throw new Error(`Button not found: ${selector}`);
  }
  return el;
}

describe('Footer', () => {
  let fixture: ComponentFixture<Footer>;
  let bookService: BookService;
  let stateService: StateService;
  let coverMotion: CoverMotionState;
  let router: ReturnType<typeof createRouterMock>;

  beforeEach(async () => {
    sessionStorage.clear();
    vi.useFakeTimers();
    router = createRouterMock('/preface', 'resolve');
    await TestBed.configureTestingModule({
      imports: [Footer],
      providers: [{ provide: Router, useValue: router }]
    }).compileComponents();
    bookService = TestBed.inject(BookService);
    stateService = TestBed.inject(StateService);
    coverMotion = TestBed.inject(CoverMotionState);
    bookService.setRouteOrder([...BOOK_NAVIGATION_FIXTURES.routes]);
    const pageTurn = TestBed.runInInjectionContext(() => new PageTurn());
    fixture = TestBed.createComponent(Footer);
    fixture.componentRef.setInput('pageTurn', pageTurn);
    fixture.detectChanges();
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('should render and update bottom page numbers for mobile single-page and desktop spread advances, and hide on cover and exit', () => {
    bookService.setPageCount('preface', 4);
    bookService.activePageType.set(PageType.Chapter);
    bookService.activeChapterSlug.set('preface');

    stateService.isDesktop.set(false);
    bookService.currentChapterPage.set(1);
    fixture.detectChanges();
    expect(queryFooterEl(fixture, '.page-left')?.textContent?.trim()).toBe('1');
    expect(queryFooterEl(fixture, '.page-right')?.textContent?.trim()).toBe('1');

    bookService.currentChapterPage.set(2);
    fixture.detectChanges();
    expect(queryFooterEl(fixture, '.page-left')?.textContent?.trim()).toBe('2');
    expect(queryFooterEl(fixture, '.page-right')?.textContent?.trim()).toBe('2');

    stateService.isDesktop.set(true);
    bookService.currentChapterPage.set(1);
    fixture.detectChanges();
    expect(queryFooterEl(fixture, '.page-left')?.textContent?.trim()).toBe('1');
    expect(queryFooterEl(fixture, '.page-right')?.textContent?.trim()).toBe('2');

    bookService.currentChapterPage.set(3);
    fixture.detectChanges();
    expect(queryFooterEl(fixture, '.page-left')?.textContent?.trim()).toBe('3');
    expect(queryFooterEl(fixture, '.page-right')?.textContent?.trim()).toBe('4');

    bookService.activePageType.set(PageType.Home);
    bookService.activeChapterSlug.set('');
    fixture.detectChanges();
    expect(queryFooterEl(fixture, '.pagination-footer')).toBeNull();

    bookService.activePageType.set(PageType.Exit);
    bookService.activeChapterSlug.set('exit');
    fixture.detectChanges();
    expect(queryFooterEl(fixture, '.pagination-footer')).toBeNull();
  });

  it('should enable next and disable prev on closed desktop cover, and enable both when cover is open', () => {
    const requests: number[] = [];
    bookService.navigationRequest.subscribe(direction => requests.push(direction));
    stateService.isDesktop.set(true);
    bookService.activePageType.set(PageType.Home);
    bookService.activeChapterSlug.set('');
    bookService.setPageCount('', 2);
    bookService.currentChapterPage.set(1);
    fixture.detectChanges();

    const prevButton = queryButton(fixture, '.page-prev');
    const nextButton = queryButton(fixture, '.page-next');

    expect(prevButton.disabled).toBe(true);
    expect(nextButton.disabled).toBe(false);

    prevButton.click();
    nextButton.click();
    expect(requests).toEqual([1]);

    coverMotion.open();
    fixture.detectChanges();

    expect(prevButton.disabled).toBe(false);
    expect(nextButton.disabled).toBe(false);

    prevButton.click();
    expect(requests).toEqual([1, -1]);
  });

  it('should enable prev and next mid-chapter and at chapter boundaries, and disable next on exit last page or spread', () => {
    const requests: number[] = [];
    bookService.navigationRequest.subscribe(direction => requests.push(direction));
    stateService.isDesktop.set(false);
    bookService.activePageType.set(PageType.Chapter);
    bookService.activeChapterSlug.set('preface');
    bookService.setPageCount('preface', 4);
    bookService.currentChapterPage.set(2);
    fixture.detectChanges();

    const prevButton = queryButton(fixture, '.page-prev');
    const nextButton = queryButton(fixture, '.page-next');

    expect(prevButton.disabled).toBe(false);
    expect(nextButton.disabled).toBe(false);
    prevButton.click();
    nextButton.click();
    expect(requests).toEqual([-1, 1]);

    bookService.currentChapterPage.set(1);
    fixture.detectChanges();
    expect(prevButton.disabled).toBe(false);

    bookService.currentChapterPage.set(4);
    fixture.detectChanges();
    expect(nextButton.disabled).toBe(false);

    bookService.activePageType.set(PageType.Exit);
    bookService.activeChapterSlug.set('exit');
    bookService.setPageCount('exit', 2);
    bookService.currentChapterPage.set(2);
    fixture.detectChanges();
    expect(prevButton.disabled).toBe(false);
    expect(nextButton.disabled).toBe(true);

    stateService.isDesktop.set(true);
    bookService.setPageCount('exit', 4);
    bookService.currentChapterPage.set(1);
    fixture.detectChanges();
    expect(nextButton.disabled).toBe(false);

    bookService.currentChapterPage.set(3);
    fixture.detectChanges();
    expect(nextButton.disabled).toBe(true);
  });

  it('should ignore rapid chapter clicks while flipping and block page turns while chapter navigation timer is active', async () => {
    const requests: number[] = [];
    bookService.navigationRequest.subscribe(direction => requests.push(direction));
    stateService.isDesktop.set(false);
    bookService.activePageType.set(PageType.Chapter);
    bookService.activeChapterSlug.set('preface');
    bookService.setPageCount('preface', 4);
    bookService.currentChapterPage.set(2);
    fixture.detectChanges();

    const chapterPrev = queryButton(fixture, '.chapter-prev');
    const chapterNext = queryButton(fixture, '.chapter-next');
    const pageNext = queryButton(fixture, '.page-next');

    chapterNext.click();
    expect(bookService.isFlipping()).toBe(true);
    expect(bookService.flipDirection()).toBe(1);
    expect(stateService.isTransitioning()).toBe(true);

    chapterPrev.click();
    chapterNext.click();
    expect(bookService.flipDirection()).toBe(1);

    pageNext.click();
    expect(requests).toEqual([]);

    await vi.advanceTimersByTimeAsync(BOOK_NAVIGATION_FIXTURES.navigationDelayMs);
    expect(router.navigate).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledWith(['/chapter-one']);
    expect(stateService.isTransitioning()).toBe(false);

    await vi.advanceTimersByTimeAsync(BOOK_NAVIGATION_FIXTURES.navigationDelayMs);
    expect(bookService.isFlipping()).toBe(false);

    pageNext.click();
    expect(requests).toEqual([1]);
  });
});

describe('Chapter page count sync helpers', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.useRealTimers();
  });

  function createPaginationSetup(viewport: { width: number; height: number }): {
    host: HTMLElement;
    deps: BookPaginationDeps;
  } {
    const host = document.createElement('div');
    Object.defineProperty(host, 'clientWidth', { value: viewport.width, configurable: true });
    Object.defineProperty(host, 'clientHeight', { value: viewport.height, configurable: true });
    return { host, deps: createBookPaginationDeps(true) };
  }

  it('should preserve domMeasuredKeys counts and restore cached chapter page counts on cache-hit sync', async () => {
    const { host, deps } = createPaginationSetup(CHAPTER_PAGINATION_FIXTURES.footerCacheViewport);
    const estimator = vi.fn<ChapterEstimator>(() => 4);

    deps.bookService.setPageCount('pt/first', 7);
    recordMeasuredChapterPage(host, deps, { slug: 'pt/first', totalCols: 7 });

    const firstSync = syncAllChapterPageCounts(host, deps, estimator);
    await vi.advanceTimersByTimeAsync(CHAPTER_PAGINATION_FIXTURES.syncTimerMs);
    await firstSync;

    expect(estimator).toHaveBeenCalledTimes(2);
    expect(estimator.mock.calls.map(call => call[1].pageId)).toEqual(['pt/second', 'pt/current']);
    expect(deps.bookService.getChapterPages('pt/first')).toBe(7);
    expect(deps.bookService.getChapterPages('pt/second')).toBe(4);
    expect(deps.bookService.getChapterPages('pt/current')).toBe(4);

    estimator.mockClear();
    deps.bookService.setPageCount('pt/first', 1);
    deps.bookService.setPageCount('pt/second', 1);
    deps.bookService.setPageCount('pt/current', 1);

    await syncAllChapterPageCounts(host, deps, estimator);

    expect(estimator).not.toHaveBeenCalled();
    expect(deps.bookService.getChapterPages('pt/first')).toBe(7);
    expect(deps.bookService.getChapterPages('pt/second')).toBe(4);
    expect(deps.bookService.getChapterPages('pt/current')).toBe(4);
  });

  it('should restore chapter page counts from sessionStorage on cold reload without re-estimating', async () => {
    const viewport = CHAPTER_PAGINATION_FIXTURES.coldReloadViewport;
    const { host, deps } = createPaginationSetup(viewport);
    const storageKey = CHAPTER_PAGINATION_FIXTURES.coldReloadStorageKey(viewport, true);
    sessionStorage.setItem(storageKey, JSON.stringify(CHAPTER_PAGINATION_FIXTURES.coldReloadCounts));
    const estimator = vi.fn<ChapterEstimator>(() => 9);

    await syncAllChapterPageCounts(host, deps, estimator);

    expect(estimator).not.toHaveBeenCalled();
    expect(deps.bookService.getChapterPages('pt/first')).toBe(CHAPTER_PAGINATION_FIXTURES.coldReloadCounts['pt/first']);
    expect(deps.bookService.getChapterPages('pt/second')).toBe(CHAPTER_PAGINATION_FIXTURES.coldReloadCounts['pt/second']);
    expect(deps.bookService.getChapterPages('pt/current')).toBe(CHAPTER_PAGINATION_FIXTURES.coldReloadCounts['pt/current']);
  });
});
