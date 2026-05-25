import { Component, AfterViewInit, ElementRef, inject, PLATFORM_ID, HostListener, OnDestroy, signal } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { BookService } from '../services/book.service';
import { PocketbaseService } from '../services/pocketbase.service';
import { I18nService } from '../services/i18n.service';
import { StateService } from '../services/state.service';
import { PageType } from '../../shared/types/page-type.enum';
import { parseLocationToNumber } from '../../shared/utils/location.utils';
import { Subject, fromEvent } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';

@Component({
  template: ''
})
export abstract class BasePage implements AfterViewInit, OnDestroy {
  protected readonly route = inject(ActivatedRoute);
  protected readonly router = inject(Router);
  protected readonly elRef = inject(ElementRef);
  protected readonly bookService = inject(BookService);
  protected readonly pbService = inject(PocketbaseService);
  protected readonly i18n = inject(I18nService);
  protected readonly stateService = inject(StateService);
  
  protected destroy$ = new Subject<void>();
  public isBrowser = this.stateService.isBrowser;

  public isTransitioning = false;
  protected isScrolling = false;
  protected lastTouchY = 0;
  protected anchorTarget = '';

  protected readonly sections = signal<any[]>([]);
  protected readonly pageData = signal<any>(null);

  get hostEl(): HTMLElement { return this.elRef.nativeElement; }

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

  constructor() {
    this.route.data.pipe(takeUntil(this.destroy$)).subscribe(data => {
      this.pageData.set(data);
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

  protected handleNavigation(direction: number) {
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

  protected triggerScroll() {
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

  protected measurePage() {
    if (!this.isBrowser) return;
    const el = this.hostEl;
    if (el && el.clientWidth > 0) {
      const isDesktop = window.innerWidth >= 768;
      const colWidth = isDesktop ? (el.clientWidth / 2) : el.clientWidth;
      const totalCols = Math.round(el.scrollWidth / colWidth);
      this.onPageMeasured(totalCols);
      this.updateCurrentPage();
    }
  }

  protected onPageMeasured(totalCols: number) {
    const el = this.hostEl;
    let effectiveCols = totalCols;
    if (this.currentSlug === '') {
      const cover = el.querySelector('.book-cover-page');
      if (cover && window.innerWidth >= 768) {
      }
    }
    
    this.bookService.setPageCount(this.currentSlug, effectiveCols);
  }

  protected updateCurrentPage() {
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
      
      this.bookService.currentPageInChapter.set(current);
    }
  }

  protected scrollToStart() {
    if (!this.isBrowser) return;
    const el = this.hostEl;
    if (el && typeof el.scrollTo === 'function') {
      el.scrollTo({ left: 0, behavior: 'instant' });
    }
  }

  protected async loadAllSections(type: PageType, lang: string, sortFn?: (a: any, b: any) => number) {
    try {
      let filter = `type = '${type}' && lang = '${lang}'`;
      const records = await this.pbService.pb.collection('pages').getFullList({
        filter: filter,
        sort: type === PageType.Home ? 'metadata.location' : ''
      });

      // Secondary sorting in JS to handle Roman numerals and string numbers correctly
      const effectiveSortFn = sortFn || ((a: any, b: any) => {
        const orderA = parseLocationToNumber(a.metadata?.location);
        const orderB = parseLocationToNumber(b.metadata?.location);
        return orderA - orderB;
      });

      records.sort(effectiveSortFn);
      
      this.sections.set(records);
      
      if (this.isBrowser) {
        setTimeout(() => {
          this.measurePage();
          this.triggerScroll();
        }, 100);
      }
    } catch (e) {
      console.error(`Failed to load sections for ${type}`, e);
    }
  }
}
