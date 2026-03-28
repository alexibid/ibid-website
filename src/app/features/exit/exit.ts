import { Component, AfterViewInit, ViewChild, ElementRef, inject, PLATFORM_ID, HostListener, OnDestroy, signal, effect } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { Cover } from '../../shared/components/cover/cover';
import { PocketbaseService } from '../../core/services/pocketbase.service';
import { I18nService } from '../../core/services/i18n.service';
import { PageType } from '../../core/models/page-type.enum';
import { BookService } from '../../core/services/book.service';
import { Subject, fromEvent } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';

@Component({
  selector: 'app-exit',
  standalone: true,
  imports: [CommonModule, Cover],
  templateUrl: './exit.html',
  styleUrl: './exit.scss',
})
export class Exit implements AfterViewInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly pbService = inject(PocketbaseService);
  private readonly i18n = inject(I18nService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private bookService = inject(BookService);
  private destroy$ = new Subject<void>();
  public isBrowser = isPlatformBrowser(this.platformId);

  protected readonly exitSections = signal<any[]>([]);
  protected anchorTarget = '';

  @ViewChild('pageContent') pageContent!: ElementRef<HTMLDivElement>;
  public isTransitioning = false;
  private isScrolling = false;
  private lastTouchY = 0;

  get currentSlug(): string {
    let url = this.router.url.split('?')[0].split('#')[0];
    return (url === '/' || url === '') ? '' : url.substring(1);
  }

  get prevSlug(): string | null {
    const routes = this.bookService.dynamicRouteOrder();
    const idx = routes.indexOf(this.currentSlug);
    if(idx > 0) return routes[idx-1];
    return null;
  }

  constructor() {
    effect(() => {
      const lang = this.i18n.currentLangCode();
      this.loadAllExitSections(lang);
    });

    this.route.data.subscribe((data) => {
      if (data && data['location']) {
        this.anchorTarget = data['location'];
        this.triggerScroll();
      }
    });
  }

  private async loadAllExitSections(lang: string) {
    try {
      const records = await this.pbService.pb.collection('pages').getFullList({
        filter: `type = '${PageType.Exit}' && lang = '${lang}'`
      });
      
      const structuralOrder = ['contact-form', 'about', 'back-cover'];
      
      records.sort((a, b) => {
        const locA = a['metadata']?.['location'];
        const locB = b['metadata']?.['location'];
        const orderA = structuralOrder.indexOf(locA) !== -1 ? structuralOrder.indexOf(locA) : 99;
        const orderB = structuralOrder.indexOf(locB) !== -1 ? structuralOrder.indexOf(locB) : 99;
        return orderA - orderB;
      });
      
      this.exitSections.set(records);
      setTimeout(() => {
        this.measureChapter();
        this.triggerScroll();
      }, 100);
    } catch (e) {
      console.error('Failed to load combined exit sections', e);
    }
  }

  private triggerScroll() {
    if (!this.isBrowser || !this.anchorTarget || !this.pageContent) return;
    setTimeout(() => {
      const el = document.getElementById(this.anchorTarget);
      const contentEl = this.pageContent?.nativeElement;
      if (el && contentEl && typeof contentEl.scrollTo === 'function') {
        contentEl.scrollTo({ left: el.offsetLeft, behavior: 'instant' });
        this.updateCurrentPage();
      }
    }, 50);
  }

  public onSubmit(event: Event) {
    event.preventDefault(); // non-functional mock
    const contentEl = this.pageContent?.nativeElement;
    if (contentEl && typeof contentEl.scrollTo === 'function') {
      contentEl.scrollTo({ left: contentEl.scrollWidth, behavior: 'smooth' });
    }
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

    if (direction === -1 && isAtStart && this.prevSlug) {
      this.isTransitioning = true;
      this.bookService.triggerFlip(direction);
      setTimeout(() => {
        this.router.navigate(['/', this.prevSlug]);
      }, 450);
      return;
    }

    if ((direction === -1 && !isAtStart) || (direction === 1 && !isAtEnd)) {
      this.bookService.triggerFlip(direction);
      this.isScrolling = true;
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
    if (this.isBrowser && window.innerWidth <= 768) {
      this.lastTouchY = event.touches[0].clientY;
    }
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(event: TouchEvent) {
    if (this.isBrowser && window.innerWidth <= 768 && this.pageContent && !this.isScrolling && !this.isTransitioning) {
      const deltaY = this.lastTouchY - event.touches[0].clientY;
      if (Math.abs(deltaY) > 20) {
        const direction = deltaY > 0 ? 1 : -1;
        this.handleNavigation(direction);
        this.lastTouchY = event.touches[0].clientY;
      }
    }
  }

  ngAfterViewInit() {
    if (!this.isBrowser) return;

    this.bookService.activeChapterSlug.set(this.currentSlug);
    this.measureChapter();

    fromEvent(window, 'resize')
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => this.measureChapter());
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
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
