import { Component, AfterViewInit, ViewChild, ElementRef, inject, PLATFORM_ID, HostListener, OnDestroy, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { BookService } from '../../core/services/book.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { Subject, fromEvent } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-chapter',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './chapter.html',
  styleUrl: './chapter.scss',
})
export class Chapter implements AfterViewInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  public bookService = inject(BookService);
  private destroy$ = new Subject<void>();
  public isBrowser = isPlatformBrowser(this.platformId);

  protected readonly pageData = signal<any>(null);

  @ViewChild('pageContent') pageContent!: ElementRef<HTMLDivElement>;
  public isTransitioning = false;
  private isScrolling = false;
  private lastTouchX = 0;
  private lastTouchY = 0;

  get currentSlug(): string {
    let url = this.router.url.split('?')[0].split('#')[0];
    return (url === '/' || url === '') ? '' : url.substring(1);
  }

  get nextSlug(): string | null {
    const routes = this.bookService.dynamicRouteOrder();
    const idx = routes.indexOf(this.currentSlug);
    if(idx !== -1 && idx < routes.length - 1) return routes[idx+1];
    return null;
  }

  get prevSlug(): string | null {
    const routes = this.bookService.dynamicRouteOrder();
    const idx = routes.indexOf(this.currentSlug);
    if(idx > 0) return routes[idx-1];
    return null;
  }

  constructor() {
    this.route.data.subscribe((data) => {
      this.pageData.set(data);
      // Wait for Angular to re-render DOM with new content
      setTimeout(() => {
        this.measureChapter();
        const contentEl = this.pageContent?.nativeElement;
        if (contentEl && typeof contentEl.scrollTo === 'function') {
           contentEl.scrollTo({ left: 0, behavior: 'instant' });
           this.updateCurrentPage();
        }
      }, 100);
    });
  }

  ngAfterViewInit() {
    if (!this.isBrowser) return;

    this.measureChapter();

    fromEvent(window, 'resize')
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => this.measureChapter());
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if (!this.isBrowser || this.isScrolling || this.isTransitioning || !this.pageContent) return;
    
    let direction = 0;
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(event.key)) direction = 1;
    else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(event.key)) direction = -1;

    if (direction !== 0) {
      event.preventDefault();
      this.handleNavigation(direction);
    }
  }

  private handleNavigation(direction: number) {
    if (!this.pageContent || this.isScrolling || this.isTransitioning) return;
    
    const el = this.pageContent.nativeElement;
    const isAtEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 10;
    const isAtStart = el.scrollLeft <= 10;

    if (direction === 1 && isAtEnd && this.nextSlug) {
      this.isTransitioning = true;
      this.bookService.triggerFlip(direction);
      setTimeout(() => {
        this.router.navigate(['/', this.nextSlug]);
      }, 450);
      return;
    }

    if (direction === -1 && isAtStart && this.prevSlug) {
      this.isTransitioning = true;
      this.bookService.triggerFlip(direction);
      setTimeout(() => {
        this.router.navigate(['/', this.prevSlug]);
      }, 450);
      return;
    }

    if ((direction === 1 && !isAtEnd) || (direction === -1 && !isAtStart)) {
      this.bookService.triggerFlip(direction);
      this.isScrolling = true;
      
      // Snap instantly!
      if (typeof el.scrollBy === 'function') {
        el.scrollBy({
          left: direction * el.clientWidth,
          behavior: 'instant'
        });
      } else {
        el.scrollLeft += direction * el.clientWidth;
      }

      setTimeout(() => {
        this.isScrolling = false;
        this.updateCurrentPage();
      }, 600);
    }
  }

  @HostListener('wheel', ['$event'])
  onWheel(event: WheelEvent) {
    if (!this.isBrowser) return;
    if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
      if (this.pageContent && !this.isScrolling && !this.isTransitioning) {
        if (Math.abs(event.deltaY) > 20) {
          const direction = event.deltaY > 0 ? 1 : -1;
          this.handleNavigation(direction);
        }
      }
    }
  }

  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent) {
    if (this.isBrowser && window.innerWidth < 768) {
      this.lastTouchX = event.touches[0].clientX;
      this.lastTouchY = event.touches[0].clientY;
    }
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(event: TouchEvent) {
    if (this.isBrowser && window.innerWidth < 768 && this.pageContent && !this.isScrolling && !this.isTransitioning) {
      const deltaX = this.lastTouchX - event.touches[0].clientX;
      const deltaY = this.lastTouchY - event.touches[0].clientY;

      // Swipe horizontal para flips
      if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
        const direction = deltaX > 0 ? 1 : -1;
        this.handleNavigation(direction);
        this.lastTouchX = event.touches[0].clientX;
      }
    }
  }

  private measureChapter() {
    if (this.pageContent) {
      const el = this.pageContent.nativeElement;
      if (el.clientWidth > 0) {
        const count = Math.round(el.scrollWidth / el.clientWidth) || 1;
        this.bookService.setPageCount(this.currentSlug, count);
        this.updateCurrentPage();
      }
    }
  }

  private updateCurrentPage() {
    if (this.pageContent) {
      const el = this.pageContent.nativeElement;
      if (el.clientWidth > 0) {
        const current = Math.round(el.scrollLeft / el.clientWidth) + 1;
        this.bookService.currentPageInChapter.set(current);
      }
    }
  }
}
