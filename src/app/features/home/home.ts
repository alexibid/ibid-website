import { Component, AfterViewInit, ViewChild, ElementRef, inject, PLATFORM_ID, HostListener, OnDestroy, signal, effect } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { Cover } from '../../shared/components/cover/cover';
import { PocketbaseService } from '../../core/services/pocketbase.service';
import { I18nService } from '../../core/services/i18n.service';
import { PageType } from '../../core/models/page-type.enum';
import { BookService } from '../../core/services/book.service';
import { Subject, fromEvent } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [Cover],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements AfterViewInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly pbService = inject(PocketbaseService);
  private readonly i18n = inject(I18nService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private bookService = inject(BookService);
  private destroy$ = new Subject<void>();
  public isBrowser = isPlatformBrowser(this.platformId);

  protected readonly homeSections = signal<any[]>([]);
  protected anchorTarget = '';

  @ViewChild('pageContent') pageContent!: ElementRef<HTMLDivElement>;
  public isTransitioning = false;
  private isScrolling = false;
  private lastTouchY = 0;

  get nextSlug(): string | null {
    const routes = this.bookService.dynamicRouteOrder();
    const langRoute = this.i18n.currentLangCode() === 'pt' ? '' : this.i18n.currentLangCode();
    const idx = routes.indexOf(langRoute);
    if(idx !== -1 && idx < routes.length - 1) return routes[idx+1];
    return null;
  }

  constructor() {
    effect(() => {
      const lang = this.i18n.currentLangCode();
      this.loadAllHomeSections(lang);
    });

    this.route.data.subscribe(data => {
      if (data && data['location']) {
        this.anchorTarget = data['location'];
        this.triggerScroll();
      }
    });
  }

  private async loadAllHomeSections(lang: string) {
    try {
      const records = await this.pbService.pb.collection('pages').getFullList({
        filter: `type = '${PageType.Home}' && lang = '${lang}'`,
        sort: 'metadata.old_id'
      });
      this.homeSections.set(records);
      setTimeout(() => {
        this.measureChapter();
        this.triggerScroll();
      }, 100);
    } catch (e) {
      console.error('Failed to load combined home sections', e);
    }
  }

  private triggerScroll() {
    if (!this.isBrowser || !this.anchorTarget || !this.pageContent) return;
    
    setTimeout(() => {
      const el = document.getElementById(this.anchorTarget);
      const contentEl = this.pageContent.nativeElement;
      if (el && contentEl && typeof contentEl.scrollTo === 'function') {
        // Because we are horizontal scrolling, we calculate offset left
        contentEl.scrollTo({ left: el.offsetLeft, behavior: 'instant' });
        this.updateCurrentPage();
      }
    }, 50);
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

    if ((direction === 1 && !isAtEnd) || (direction === -1 && !isAtStart)) {
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

    // A slug na Home Pt é '', na en é 'en'
    const langRoute = this.i18n.currentLangCode() === 'pt' ? '' : this.i18n.currentLangCode();
    this.bookService.activeChapterSlug.set(langRoute);
    
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
        const langRoute = this.i18n.currentLangCode() === 'pt' ? '' : this.i18n.currentLangCode();
        this.bookService.setPageCount(langRoute, count);
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
