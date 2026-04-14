import { Component, AfterViewInit, ElementRef, inject, PLATFORM_ID, HostListener, OnDestroy, signal } from '@angular/core';
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
  private elRef = inject(ElementRef);
  public bookService = inject(BookService);
  private destroy$ = new Subject<void>();
  public isBrowser = isPlatformBrowser(this.platformId);

  protected readonly pageData = signal<any>(null);
  protected readonly needsBlankPage = signal<boolean>(false);
  
  public isTransitioning = false;
  private isScrolling = false;
  private lastTouchX = 0;
  private lastTouchY = 0;

  get hostEl(): HTMLElement { return this.elRef.nativeElement; }

  get currentSlug(): string {
    let url = this.router.url.split('?')[0].split('#')[0];
    return (url === '/' || url === '') ? '' : url.substring(1);
  }

  get nextSlug(): string | null {
    const routes = this.bookService.dynamicRouteOrder();
    const idx = routes.indexOf(this.currentSlug);
    return (idx !== -1 && idx < routes.length - 1) ? routes[idx+1] : null;
  }

  get prevSlug(): string | null {
    const routes = this.bookService.dynamicRouteOrder();
    const idx = routes.indexOf(this.currentSlug);
    return (idx > 0) ? routes[idx-1] : null;
  }

  constructor() {
    this.route.data.subscribe((data) => {
      this.pageData.set(data);
      this.needsBlankPage.set(false); // Reset
      setTimeout(() => {
        const el = this.hostEl;
        if (el) {
          el.scrollTo({ left: 0, behavior: 'instant' });
          this.measureChapter();
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
    if (!this.isBrowser || this.isScrolling || this.isTransitioning) return;
    let direction = 0;
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(event.key)) direction = 1;
    else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(event.key)) direction = -1;
    if (direction !== 0) {
      event.preventDefault();
      this.handleNavigation(direction);
    }
  }

  private handleNavigation(direction: number) {
    const el = this.hostEl;
    if (!el || this.isScrolling || this.isTransitioning) return;
    
    // Agora o scroll é sempre 100% da largura visível (Spread)
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
      
      // Salto de spread completo (2 páginas no desktop)
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

  private measureChapter() {
    const el = this.hostEl;
    if (el && el.clientWidth > 0) {
      const isDesktop = window.innerWidth >= 768;
      const colWidth = isDesktop ? (el.clientWidth / 2) : el.clientWidth;
      const totalCols = Math.round(el.scrollWidth / colWidth);
      
      // Se tivermos um número ímpar de colunas no desktop, precisamos de uma página em branco
      if (isDesktop && totalCols % 2 !== 0) {
        this.needsBlankPage.set(true);
        // Re-medir após o Angular adicionar a blank-page
        setTimeout(() => this.updatePageCount(), 50);
      } else {
        this.updatePageCount();
      }
    }
  }

  private updatePageCount() {
    const el = this.hostEl;
    if (el) {
      const isDesktop = window.innerWidth >= 768;
      const colWidth = isDesktop ? (el.clientWidth / 2) : el.clientWidth;
      const totalCols = Math.round(el.scrollWidth / colWidth);
      this.bookService.setPageCount(this.currentSlug, totalCols);
      this.updateCurrentPage();
    }
  }

  private updateCurrentPage() {
    const el = this.hostEl;
    if (el && el.clientWidth > 0) {
      const isDesktop = window.innerWidth >= 768;
      const colWidth = isDesktop ? (el.clientWidth / 2) : el.clientWidth;
      
      // A página atual é baseada na primeira coluna visível
      const current = Math.round(el.scrollLeft / colWidth) + 1;
      this.bookService.currentPageInChapter.set(current);
    }
  }
}
