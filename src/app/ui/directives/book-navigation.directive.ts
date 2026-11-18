import { Directive, ElementRef, HostListener, OnDestroy, OnInit, AfterViewInit, inject, output } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { BookService } from '../../infrastructure/services/book.service';
import { StateService } from '../../application/state/state.service';
import { Subject, fromEvent } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';

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

  public readonly pageMeasured = output<number>();

  private readonly destroy$ = new Subject<void>();
  private readonly isBrowser = this.stateService.isBrowser;

  private isTransitioning = false;
  private isScrolling = false;
  private lastTouchY = 0;
  private anchorTarget = '';

  get hostEl(): HTMLElement {
    return this.elRef.nativeElement;
  }

  get currentSlug(): string {
    const url = this.router.url.split('?')[0].split('#')[0];
    let slug = (url === '/' || url === '') ? '' : url.substring(1);
    if (slug.startsWith('/')) slug = slug.substring(1);
    return slug;
  }

  get nextSlug(): string | null {
    const routes = this.bookService.dynamicRouteOrder();
    const current = this.currentSlug;
    const idx = routes.indexOf(current);
    
    if (idx === -1 && current === '') {
      return routes.length > 1 ? routes[1] : null;
    }
    
    return (idx !== -1 && idx < routes.length - 1) ? routes[idx + 1] : null;
  }

  get prevSlug(): string | null {
    const routes = this.bookService.dynamicRouteOrder();
    const current = this.currentSlug;
    const idx = routes.indexOf(current);
    return (idx > 0) ? routes[idx - 1] : null;
  }

  ngOnInit() {
    this.route.data.pipe(takeUntil(this.destroy$)).subscribe(data => {
      if (data && data['location']) {
        this.anchorTarget = data['location'];
        this.triggerScroll();
      }
    });

    this.route.fragment.pipe(takeUntil(this.destroy$)).subscribe(fragment => {
      if (fragment) {
        this.anchorTarget = fragment;
        this.triggerScroll();
      }
    });

    this.bookService.navigationRequest.pipe(takeUntil(this.destroy$)).subscribe(dir => {
      this.handleNavigation(dir);
    });
  }

  ngAfterViewInit() {
    if (!this.isBrowser) return;
    
    this.bookService.activeChapterSlug.set(this.currentSlug);
    
    this.measurePage();
    fromEvent(window, 'resize')
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => this.measurePage());
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if (!this.isBrowser || this.isScrolling || this.isTransitioning) return;
    let direction = 0;
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(event.key)) direction = 1;
    else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(event.key)) direction = -1;
    if (direction !== 0) {
      event.preventDefault();
      this.handleNavigation(direction);
    }
  }

  @HostListener('wheel', ['$event'])
  onWheel(event: WheelEvent) {
    if (this.isBrowser && Math.abs(event.deltaY) > 30 && !this.isScrolling && !this.isTransitioning) {
      this.handleNavigation(event.deltaY > 0 ? 1 : -1);
    }
  }

  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent) {
    if (this.isBrowser) {
      this.lastTouchY = event.touches[0].clientY;
    }
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(event: TouchEvent) {
    if (this.isBrowser && !this.isScrolling && !this.isTransitioning) {
      const deltaY = this.lastTouchY - event.touches[0].clientY;
      if (Math.abs(deltaY) > 30) {
        this.handleNavigation(deltaY > 0 ? 1 : -1);
        this.lastTouchY = event.touches[0].clientY;
      }
    }
  }

  public handleNavigation(direction: number) {
    const el = this.hostEl;
    if (!el || this.isScrolling || this.isTransitioning) return;
    
    const isAtEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 10;
    const isAtStart = el.scrollLeft <= 10;

    if (direction === 1 && isAtEnd && this.nextSlug !== null) {
      this.isTransitioning = true;
      this.bookService.triggerFlip(direction);
      setTimeout(() => { this.router.navigate(['/' + this.nextSlug]); }, 450);
      return;
    }

    if (direction === -1 && isAtStart && this.prevSlug !== null) {
      this.isTransitioning = true;
      this.bookService.triggerFlip(direction);
      setTimeout(() => { this.router.navigate(['/' + this.prevSlug]); }, 450);
      return;
    }

    if ((direction === 1 && !isAtEnd) || (direction === -1 && !isAtStart)) {
      this.bookService.triggerFlip(direction);
      this.isScrolling = true;
      el.scrollBy({ left: direction * el.clientWidth, behavior: 'instant' });
      setTimeout(() => {
        this.isScrolling = false;
        this.updateCurrentPage();
      }, 500);
    }
  }

  public triggerScroll() {
    if (!this.isBrowser || !this.anchorTarget) return;
    setTimeout(() => {
      const el = document.getElementById(this.anchorTarget);
      if (el && typeof el.scrollTo === 'function') {
        const viewportWidth = this.hostEl.clientWidth;
        const targetScroll = Math.floor(el.offsetLeft / viewportWidth) * viewportWidth;
        
        this.hostEl.scrollTo({ left: targetScroll, behavior: 'instant' });
        this.updateCurrentPage();
      }
    }, 100);
  }

  public measurePage() {
    if (!this.isBrowser) return;
    const el = this.hostEl;
    if (el && el.clientWidth > 0) {
      const isDesktop = window.innerWidth >= 768;
      const colWidth = isDesktop ? (el.clientWidth / 2) : el.clientWidth;
      const totalCols = Math.round(el.scrollWidth / colWidth);
      this.pageMeasured.emit(totalCols);
      this.updateCurrentPage();
    }
  }

  public updateCurrentPage() {
    if (!this.isBrowser) return;
    const el = this.hostEl;
    if (el && el.clientWidth > 0) {
      const isDesktop = window.innerWidth >= 768;
      const colWidth = isDesktop ? (el.clientWidth / 2) : el.clientWidth;
      
      let current: number;
      
      if (this.currentSlug === '' && el.scrollLeft < 10) {
        current = 1;
      } else {
        current = Math.round(el.scrollLeft / colWidth) + 1;
      }
      
      this.bookService.currentChapterPage.set(current);
    }
  }

  public scrollToStart() {
    if (!this.isBrowser) return;
    const el = this.hostEl;
    if (el && typeof el.scrollTo === 'function') {
      el.scrollTo({ left: 0, behavior: 'instant' });
    }
  }
}
