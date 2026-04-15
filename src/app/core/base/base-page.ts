import { Component, AfterViewInit, ElementRef, inject, PLATFORM_ID, HostListener, OnDestroy, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { BookService } from '../services/book.service';
import { Subject, fromEvent } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';

@Component({
  template: ''
})
export abstract class BasePage implements AfterViewInit, OnDestroy {
  protected readonly route = inject(ActivatedRoute);
  protected readonly router = inject(Router);
  protected readonly platformId = inject(PLATFORM_ID);
  protected readonly elRef = inject(ElementRef);
  protected readonly bookService = inject(BookService);
  protected destroy$ = new Subject<void>();
  public isBrowser = isPlatformBrowser(this.platformId);

  public isTransitioning = false;
  protected isScrolling = false;
  protected lastTouchY = 0;

  get hostEl(): HTMLElement { return this.elRef.nativeElement; }

  // Getters comuns de navegação
  get currentSlug(): string {
    const url = this.router.url.split('?')[0].split('#')[0];
    return (url === '/' || url === '') ? '' : url.substring(1);
  }

  get nextSlug(): string | null {
    const routes = this.bookService.dynamicRouteOrder();
    const idx = routes.indexOf(this.currentSlug);
    return (idx !== -1 && idx < routes.length - 1) ? routes[idx + 1] : null;
  }

  get prevSlug(): string | null {
    const routes = this.bookService.dynamicRouteOrder();
    const idx = routes.indexOf(this.currentSlug);
    return (idx > 0) ? routes[idx - 1] : null;
  }

  ngAfterViewInit() {
    if (!this.isBrowser) return;
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

    if (direction === 1 && isAtEnd && this.nextSlug) {
      this.isTransitioning = true;
      this.bookService.triggerFlip(direction);
      setTimeout(() => { this.router.navigate(['/', this.nextSlug]); }, 450);
      return;
    }

    if (direction === -1 && isAtStart && this.prevSlug) {
      this.isTransitioning = true;
      this.bookService.triggerFlip(direction);
      setTimeout(() => { this.router.navigate(['/', this.prevSlug]); }, 450);
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

  protected measurePage() {
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
    this.bookService.setPageCount(this.currentSlug, totalCols);
  }

  protected updateCurrentPage() {
    const el = this.hostEl;
    if (el && el.clientWidth > 0) {
      const isDesktop = window.innerWidth >= 768;
      const colWidth = isDesktop ? (el.clientWidth / 2) : el.clientWidth;
      const current = Math.round(el.scrollLeft / colWidth) + 1;
      this.bookService.currentPageInChapter.set(current);
    }
  }

  protected scrollToStart() {
    const el = this.hostEl;
    if (el) el.scrollTo({ left: 0, behavior: 'instant' });
  }
}
