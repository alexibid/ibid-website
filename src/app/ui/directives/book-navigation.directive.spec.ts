import { ElementRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { CoverMotionState } from '../../application/state/cover-motion.state';
import { StateService } from '../../application/state/state.service';
import { PageType } from '../../domain/models/page-type.enum';
import { BookService } from '../../infrastructure/services/book.service';
import {
  BOOK_NAVIGATION_FIXTURES,
  BOOK_NAVIGATION_SCENARIOS,
  createBookNavigationHarness,
  type BookNavigationHarness,
  type RouterOutcome
} from '../../../mocks/book-navigation.mock';
import { BookNavigationDirective } from './book-navigation.directive';

const {
  routes,
  viewportWidth,
  desktopViewportWidth,
  desktopScrollWidth,
  navigationDelayMs,
  scrollLockMs
} = BOOK_NAVIGATION_FIXTURES;
const lastSpreadScroll = BOOK_NAVIGATION_FIXTURES.scrollWidth - viewportWidth;

describe('BookNavigationDirective', () => {
  let harness: BookNavigationHarness;
  let bookService: BookService;
  let coverMotion: CoverMotionState;
  let directive: BookNavigationDirective;

  function syncHarnessLinks(url: string, pageType: PageType, isDesktop: boolean): void {
    const slug = harness.stateService.resolveSlugFromUrl(url);
    const slugs: readonly string[] = routes.map(route => route.slug);
    const index = slugs.indexOf(slug);
    harness.stateService.prevLink.set(index > 0 ? '/' + slugs[index - 1] : null);
    harness.stateService.nextLink.set(index >= 0 && index < slugs.length - 1 ? '/' + slugs[index + 1] : null);
    harness.stateService.isDesktopCoverStage.set(isDesktop && pageType === PageType.Home);
  }

  function createDirective(
    url: string,
    scrollLeft: number,
    options?: { outcome?: RouterOutcome; isDesktop?: boolean; pageType?: PageType }
  ): void {
    const outcome = options?.outcome ?? 'resolve';
    const isDesktop = options?.isDesktop ?? false;
    const pageType =
      options?.pageType ?? (url === '/' ? PageType.Home : url === '/exit' ? PageType.Exit : PageType.Chapter);
    harness = createBookNavigationHarness(url, scrollLeft, outcome);
    if (isDesktop) {
      harness.stateService.isDesktop.set(true);
      harness.host.clientWidth = desktopViewportWidth;
      harness.host.scrollWidth = desktopScrollWidth;
    }
    syncHarnessLinks(url, pageType, isDesktop);
    TestBed.configureTestingModule({
      providers: [
        { provide: ElementRef, useValue: new ElementRef(harness.host) },
        { provide: Router, useValue: harness.router },
        { provide: ActivatedRoute, useValue: harness.activatedRoute },
        { provide: StateService, useValue: harness.stateService }
      ]
    });
    bookService = TestBed.inject(BookService);
    coverMotion = TestBed.inject(CoverMotionState);
    bookService.setRouteOrder([...routes]);
    bookService.activePageType.set(pageType);
    directive = TestBed.runInInjectionContext(() => new BookNavigationDirective());
    directive.ngOnInit();
  }

  function createTextArea(scrollHeight: number): HTMLTextAreaElement {
    const textArea = document.createElement('textarea');
    const { visibleHeight } = BOOK_NAVIGATION_SCENARIOS.textAreaGestures;
    Object.defineProperty(textArea, 'clientHeight', { value: visibleHeight });
    Object.defineProperty(textArea, 'scrollHeight', { value: scrollHeight });
    return textArea;
  }

  function wheelOver(target: Node): void {
    const event = new WheelEvent('wheel', { deltaY: BOOK_NAVIGATION_SCENARIOS.textAreaGestures.wheelDeltaY });
    target.dispatchEvent(event);
    directive.onWheel(event);
  }

  function swipeOver(target: Node): void {
    const { touchStartY, touchEndY } = BOOK_NAVIGATION_SCENARIOS.textAreaGestures;
    const touchAt = (type: string, clientY: number): TouchEvent => {
      const event = new TouchEvent(type);
      Object.defineProperty(event, 'touches', { value: [{ clientY }] });
      target.dispatchEvent(event);
      return event;
    };
    directive.onTouchStart(touchAt('touchstart', touchStartY));
    directive.onTouchMove(touchAt('touchmove', touchEndY));
  }

  function resetDirective(): void {
    directive.ngOnDestroy();
    TestBed.resetTestingModule();
  }

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    directive.ngOnDestroy();
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('should scroll one spread and update the current page when next is clicked within the chapter', () => {
    createDirective('/preface', 0);

    bookService.navigationRequest.next(1);

    expect(harness.host.scrollLeft).toBe(viewportWidth);
    expect(bookService.currentChapterPage()).toBe(2);
    expect(harness.router.navigate).not.toHaveBeenCalled();
  });

  it('should show the next two pages on desktop when next is clicked and go back on previous in desktop and mobile', async () => {
    createDirective('/preface', 0, { isDesktop: true });

    bookService.navigationRequest.next(1);
    expect(harness.host.scrollLeft).toBe(desktopViewportWidth);
    expect(bookService.currentChapterPage()).toBe(3);

    await vi.advanceTimersByTimeAsync(scrollLockMs);
    bookService.navigationRequest.next(-1);
    expect(harness.host.scrollLeft).toBe(0);
    expect(bookService.currentChapterPage()).toBe(1);

    resetDirective();
    createDirective('/preface', viewportWidth);

    bookService.navigationRequest.next(-1);
    expect(harness.host.scrollLeft).toBe(0);
    expect(bookService.currentChapterPage()).toBe(1);
  });

  it.each(BOOK_NAVIGATION_SCENARIOS.forwardBoundaryRows)(
    'should navigate forward across $label and reset currentChapterPage to 1 on NavigationEnd',
    async row => {
      createDirective(row.url, row.scrollLeft, { isDesktop: row.isDesktop, pageType: row.pageType });
      harness.host.scrollWidth = row.scrollWidth;
      if (row.coverOpen) coverMotion.open();
      if (row.requiresCoverOpen) {
        bookService.navigationRequest.next(1);
        expect(coverMotion.isOpen()).toBe(true);
        await vi.advanceTimersByTimeAsync(scrollLockMs);
      }

      bookService.navigationRequest.next(1);
      expect(harness.stateService.navigateWithFlip).toHaveBeenCalledWith(
        row.expectedTarget,
        1,
        { state: { turnDirection: 1 } }
      );
      await vi.advanceTimersByTimeAsync(navigationDelayMs);

      expect(harness.router.navigate).toHaveBeenCalledWith([row.expectedTarget], { state: { turnDirection: 1 } });

      bookService.currentChapterPage.set(3);
      harness.router.url = row.expectedTarget;
      harness.router.lastSuccessfulNavigation.set(BOOK_NAVIGATION_SCENARIOS.turnForwardState);
      harness.router.events.next(new NavigationEnd(1, row.url, row.expectedTarget));

      expect(harness.stateService.cancelScheduledNavigation).toHaveBeenCalled();
      expect(bookService.currentChapterPage()).toBe(1);
    }
  );

  it.each(BOOK_NAVIGATION_SCENARIOS.backwardBoundaryRows)(
    'should navigate backward across $label',
    async row => {
      createDirective(row.url, 0);

      bookService.navigationRequest.next(-1);
      expect(coverMotion.isOpen()).toBe(row.expectedCoverOpen);
      expect(harness.stateService.navigateWithFlip).toHaveBeenCalledWith(
        row.expectedTarget,
        -1,
        { state: { turnDirection: -1 } }
      );
      await vi.advanceTimersByTimeAsync(navigationDelayMs);

      expect(harness.router.navigate).toHaveBeenCalledWith([row.expectedTarget], { state: { turnDirection: -1 } });
    }
  );

  it('should close an open desktop cover on previous and ignore previous when the cover is closed', () => {
    createDirective('/', 0, { isDesktop: true, pageType: PageType.Home });

    bookService.navigationRequest.next(-1);
    expect(harness.router.navigate).not.toHaveBeenCalled();
    expect(harness.host.scrollBy).not.toHaveBeenCalled();
    expect(harness.host.scrollTo).not.toHaveBeenCalled();
    expect(coverMotion.isOpen()).toBe(false);

    coverMotion.open();
    harness.host.scrollLeft = desktopViewportWidth;
    bookService.navigationRequest.next(-1);
    expect(coverMotion.isOpen()).toBe(false);
    expect(harness.router.navigate).not.toHaveBeenCalled();
  });

  it('should ignore rapid previous clicks before turn-back scroll settles and stay unlocked after navigation settles', async () => {
    createDirective('/chapter-one', 0);
    bookService.setPageCount('chapter-one', 3);
    harness.router.lastSuccessfulNavigation.set(BOOK_NAVIGATION_SCENARIOS.turnBackState);
    harness.router.events.next(new NavigationEnd(1, '/preface', '/chapter-one'));

    expect(bookService.currentChapterPage()).toBe(3);

    bookService.navigationRequest.next(-1);
    await vi.advanceTimersByTimeAsync(navigationDelayMs);
    expect(harness.router.navigate).not.toHaveBeenCalled();

    harness.host.scrollLeft = lastSpreadScroll;
    bookService.navigationRequest.next(-1);
    expect(harness.host.scrollLeft).toBe(viewportWidth);
    expect(bookService.currentChapterPage()).toBe(2);

    await vi.advanceTimersByTimeAsync(scrollLockMs);
    bookService.navigationRequest.next(-1);
    expect(harness.host.scrollLeft).toBe(0);
    expect(bookService.currentChapterPage()).toBe(1);
  });

  it.each<RouterOutcome>(['resolve', 'reject', 'pending'])(
    'should ignore rapid clicks in a chapter and during a page turn, then release the lock after navigation %s',
    async outcome => {
      createDirective('/preface', viewportWidth, { outcome });

      bookService.navigationRequest.next(1);
      bookService.navigationRequest.next(1);
      expect(harness.host.scrollLeft).toBe(lastSpreadScroll);
      expect(bookService.currentChapterPage()).toBe(3);
      await vi.advanceTimersByTimeAsync(scrollLockMs);

      bookService.navigationRequest.next(1);
      bookService.navigationRequest.next(1);
      bookService.navigationRequest.next(1);
      await vi.advanceTimersByTimeAsync(navigationDelayMs);
      bookService.navigationRequest.next(1);
      expect(harness.router.navigate).toHaveBeenCalledTimes(1);

      if (outcome === 'pending') {
        harness.router.events.next(new NavigationEnd(1, '/preface', '/chapter-one'));
      }
      bookService.navigationRequest.next(1);
      await vi.advanceTimersByTimeAsync(navigationDelayMs);

      expect(harness.router.navigate).toHaveBeenCalledTimes(2);
    }
  );

  it('should never turn the page on wheel or swipe inside a scrollable textarea, and turn it when the textarea does not overflow', async () => {
    const { overflowingScrollHeight, fittingScrollHeight, typedText } = BOOK_NAVIGATION_SCENARIOS.textAreaGestures;
    createDirective('/preface', 0);
    const scrollable = createTextArea(overflowingScrollHeight);
    const fitting = createTextArea(fittingScrollHeight);
    const textInside = scrollable.appendChild(document.createTextNode(typedText));
    const paragraph = document.createElement('p');

    wheelOver(scrollable);
    swipeOver(scrollable);
    wheelOver(textInside);
    swipeOver(textInside);
    await vi.advanceTimersByTimeAsync(navigationDelayMs);

    expect(harness.host.scrollBy).not.toHaveBeenCalled();
    expect(harness.host.scrollLeft).toBe(0);
    expect(harness.stateService.navigateWithFlip).not.toHaveBeenCalled();
    expect(harness.router.navigate).not.toHaveBeenCalled();

    wheelOver(fitting);
    expect(harness.host.scrollLeft).toBe(viewportWidth);
    await vi.advanceTimersByTimeAsync(scrollLockMs);
    swipeOver(fitting);
    expect(harness.host.scrollLeft).toBe(lastSpreadScroll);

    await vi.advanceTimersByTimeAsync(scrollLockMs);
    harness.host.scrollLeft = 0;
    wheelOver(paragraph);
    expect(harness.host.scrollLeft).toBe(viewportWidth);
    await vi.advanceTimersByTimeAsync(scrollLockMs);
    swipeOver(paragraph);
    expect(harness.host.scrollLeft).toBe(lastSpreadScroll);
  });
});
