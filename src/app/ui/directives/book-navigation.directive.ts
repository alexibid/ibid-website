import {
  AfterViewInit, Directive, ElementRef, HostListener, OnDestroy, OnInit, inject, output, signal
} from '@angular/core';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { BookService } from '../../infrastructure/services/book.service';
import { StateService } from '../../application/state/state.service';
import { CoverMotionState } from '../../application/state/cover-motion.state';
import { PageType } from '../../domain/models/page-type.enum';
import { Subject, fromEvent } from 'rxjs';
import { debounceTime, filter, takeUntil } from 'rxjs/operators';
import {
  isButtonSpaceActivation,
  isEditableNavigationTarget,
  isScrollableTextAreaTarget
} from './book-navigation-target';

@Directive({
  selector: '[websiteBookNavigation]',
  standalone: true
})
export class BookNavigationDirective implements OnInit, AfterViewInit, OnDestroy {
  private readonly elRef = inject(ElementRef);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly bookService = inject(BookService);
  private readonly stateService = inject(StateService);
  private readonly coverMotion = inject(CoverMotionState);

  public readonly pageMeasured = output<number>();
  public readonly needsBlankPage = signal<boolean>(false);

  private readonly destroy$ = new Subject<void>();
  private readonly isBrowser = this.stateService.isBrowser;

  private isScrolling = false;
  private lastTouchY = 0;
  private anchorTarget = '';
  private scrollLockTimer: ReturnType<typeof setTimeout> | undefined;
  private anchorScrollTimer: ReturnType<typeof setTimeout> | undefined;
  private remeasureTimer: ReturnType<typeof setTimeout> | undefined;

  get hostEl(): HTMLElement {
    return this.elRef.nativeElement;
  }

  get hasFragment(): boolean {
    return this.anchorTarget.length > 0;
  }

  get currentSlug(): string {
    return this.stateService.resolveSlugFromUrl(this.router.url);
  }

  get nextSlug(): string | null {
    const link = this.stateService.nextLink();
    return link === null ? null : this.stateService.resolveSlugFromUrl(link);
  }

  get prevSlug(): string | null {
    const link = this.stateService.prevLink();
    return link === null ? null : this.stateService.resolveSlugFromUrl(link);
  }

  ngOnInit(): void {
    this.route.fragment.pipe(takeUntil(this.destroy$)).subscribe(fragment => {
      this.anchorTarget = fragment ?? '';
      if (fragment) this.triggerScroll();
    });

    const isNavEnd = (event: unknown): event is NavigationEnd => event instanceof NavigationEnd;
    this.router.events.pipe(filter(isNavEnd), takeUntil(this.destroy$)).subscribe(() => {
      this.onNavigationEnd();
    });

    this.bookService.navigationRequest
      .pipe(takeUntil(this.destroy$))
      .subscribe(direction => this.handleNavigation(direction));
    this.coverMotion.landed.pipe(takeUntil(this.destroy$)).subscribe(() => {
      if (this.stateService.isDesktopCoverStage()) this.scrollToStart();
    });
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;
    this.bookService.activeChapterSlug.set(this.currentSlug);
    fromEvent(window, 'resize')
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => this.measurePage());
  }

  ngOnDestroy(): void {
    this.clearTimers();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private clearTimers(): void {
    clearTimeout(this.scrollLockTimer);
    clearTimeout(this.anchorScrollTimer);
    clearTimeout(this.remeasureTimer);
    this.stateService.cancelScheduledNavigation();
  }

  private onNavigationEnd(): void {
    this.clearTimers();
    this.isScrolling = false;
    const slug = this.currentSlug;
    this.bookService.activeChapterSlug.set(slug);
    const total = this.bookService.getChapterPages(slug);
    const offset = this.stateService.isDesktop() && total % 2 === 0 ? 1 : 0;
    this.bookService.currentChapterPage.set(this.isTurningBack() ? Math.max(1, total - offset) : 1);
  }

  public isTurningBack(): boolean {
    return typeof this.router.lastSuccessfulNavigation === 'function'
      && this.router.lastSuccessfulNavigation()?.extras.state?.['turnDirection'] === -1;
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (!this.isBrowser || this.isScrolling || this.stateService.isTransitioning()) return;
    if (event.defaultPrevented || event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
    if (isEditableNavigationTarget(event.target) || isButtonSpaceActivation(event)) return;
    let direction = 0;
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(event.key)) direction = 1;
    else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(event.key)) direction = -1;
    if (direction === 0) return;
    event.preventDefault();
    this.handleNavigation(direction);
  }

  @HostListener('wheel', ['$event'])
  onWheel(event: WheelEvent): void {
    if (!this.isBrowser || this.isScrolling || this.stateService.isTransitioning()) return;
    if (isScrollableTextAreaTarget(event.target)) return;
    if (Math.abs(event.deltaY) > 30) this.handleNavigation(event.deltaY > 0 ? 1 : -1);
  }

  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent): void {
    if (!this.isBrowser || event.touches.length === 0) return;
    this.lastTouchY = event.touches[0].clientY;
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(event: TouchEvent): void {
    if (!this.isBrowser || this.isScrolling || this.stateService.isTransitioning()) return;
    if (event.touches.length === 0 || isScrollableTextAreaTarget(event.target)) return;
    const deltaY = this.lastTouchY - event.touches[0].clientY;
    if (Math.abs(deltaY) > 30) {
      this.handleNavigation(deltaY > 0 ? 1 : -1);
      this.lastTouchY = event.touches[0].clientY;
    }
  }

  public handleNavigation(direction: number): void {
    const hostElement = this.hostEl;
    if (!hostElement || this.isScrolling || this.stateService.isTransitioning()) return;

    if (this.isFrontCoverTurn(direction)) return this.turnFrontCover(direction);

    const isAtEnd = hostElement.scrollLeft + hostElement.clientWidth >= hostElement.scrollWidth - 10;
    const isAtStart = hostElement.scrollLeft <= 10;

    if (direction === 1 && isAtEnd && this.nextSlug !== null) {
      return this.scheduleRouteTransition(this.nextSlug, direction);
    }

    if (direction === -1 && isAtStart && this.bookService.currentChapterPage() > 1) return;

    if (direction === -1 && isAtStart && this.prevSlug !== null) {
      this.keepCoverOpenWhenEnteringHome(this.prevSlug);
      return this.scheduleRouteTransition(this.prevSlug, direction);
    }

    if ((direction === 1 && !isAtEnd) || (direction === -1 && !isAtStart)) {
      this.bookService.triggerFlip(direction);
      hostElement.scrollBy({ left: direction * hostElement.clientWidth, behavior: 'instant' });
      this.updateCurrentPage();
      this.lockUntilScrollSettles();
    }
  }

  private scheduleRouteTransition(targetSlug: string, direction: number): void {
    this.clearTimers();
    this.stateService.navigateWithFlip('/' + targetSlug, direction, { state: { turnDirection: direction } });
  }

  private lockUntilScrollSettles(): void {
    clearTimeout(this.scrollLockTimer);
    this.isScrolling = true;
    this.scrollLockTimer = setTimeout(() => {
      this.isScrolling = false;
      this.updateCurrentPage();
    }, 500);
  }

  private isFrontCoverTurn(direction: number): boolean {
    if (!this.stateService.isDesktopCoverStage()) return false;
    const isOpen = this.coverMotion.isOpen();
    if (direction === 1) return !isOpen;
    return direction === -1 && isOpen && this.hostEl.scrollLeft - this.hostEl.clientWidth < 10;
  }

  private turnFrontCover(direction: number): void {
    if (direction === 1) {
      this.coverMotion.open();
      this.hostEl.scrollTo({ left: this.hostEl.clientWidth, behavior: 'instant' });
    } else this.coverMotion.close();
    this.updateCurrentPage();
    this.lockUntilScrollSettles();
  }

  private keepCoverOpenWhenEnteringHome(slug: string): void {
    const target = this.bookService.routesMetadata().find(route => route.slug === slug);
    if (target?.type !== PageType.Home) return;
    this.coverMotion.open();
  }

  private alignWithCover(): void {
    if (!this.stateService.isDesktopCoverStage()) return;
    const hostElement = this.hostEl;
    const isOnCoverSpread = hostElement.scrollLeft < 10;
    if (this.coverMotion.isOpen() && isOnCoverSpread) {
      const targetLeft = Math.max(hostElement.clientWidth, hostElement.scrollWidth - hostElement.clientWidth);
      hostElement.scrollTo({ left: targetLeft, behavior: 'instant' });
      return;
    }
    if (!isOnCoverSpread) this.coverMotion.open();
  }

  public triggerScroll(): void {
    if (!this.isBrowser || !this.anchorTarget) return;
    clearTimeout(this.anchorScrollTimer);
    this.anchorScrollTimer = setTimeout(() => {
      const targetElement = document.getElementById(this.anchorTarget);
      const viewportWidth = this.hostEl.clientWidth;
      if (targetElement && viewportWidth > 0) {
        const targetScroll = Math.floor(targetElement.offsetLeft / viewportWidth) * viewportWidth;
        this.hostEl.scrollTo({ left: targetScroll, behavior: 'instant' });
        this.updateCurrentPage();
      }
    }, 100);
  }

  public measurePage(): void {
    if (!this.isBrowser || this.hostEl.clientWidth <= 0) return;
    const totalCols = Math.max(1, this.columnsIn(this.hostEl.scrollWidth));
    if (this.isBlankPageOutOfBalance(totalCols)) this.toggleBlankPage();
    else {
      this.alignWithCover();
      this.pageMeasured.emit(totalCols);
      this.updateCurrentPage();
    }
  }

  public resetBlankPage(): void {
    this.needsBlankPage.set(false);
  }

  private isBlankPageOutOfBalance(totalCols: number): boolean {
    const colsWithoutBlank = this.needsBlankPage() ? totalCols - 1 : totalCols;
    return this.stateService.isDesktop() && (colsWithoutBlank % 2 !== 0) !== this.needsBlankPage();
  }

  private toggleBlankPage(): void {
    this.needsBlankPage.update(needsBlank => !needsBlank);
    clearTimeout(this.remeasureTimer);
    this.remeasureTimer = setTimeout(() => this.measurePage(), 50);
  }

  public columnsIn(width: number): number {
    const columnWidth = this.stateService.isDesktop()
      ? this.hostEl.clientWidth / 2
      : this.hostEl.clientWidth;
    return Math.round(width / columnWidth);
  }

  public updateCurrentPage(): void {
    if (!this.isBrowser || this.hostEl.clientWidth <= 0) return;
    const scrollLeft = this.hostEl.scrollLeft;
    const current = scrollLeft < 10 ? 1 : this.columnsIn(scrollLeft) + 1;
    this.bookService.currentChapterPage.set(current);
  }

  public scrollToStart(): void {
    if (!this.isBrowser || typeof this.hostEl.scrollTo !== 'function') return;
    this.hostEl.scrollTo({ left: 0, behavior: 'instant' });
    this.updateCurrentPage();
  }
}
