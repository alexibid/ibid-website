import { Injectable, computed, inject, signal, PLATFORM_ID, effect, isDevMode } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { BookService } from './book.service';
import { I18nService } from './i18n.service';
import { PageType } from '../../shared/types/page-type.enum';
import { CmsRouteData } from '../../shared/types/cms.interface';

@Injectable({
  providedIn: 'root'
})
export class StateService {
  private bookService = inject(BookService);
  private i18n = inject(I18nService);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private platformId = inject(PLATFORM_ID);

  public isBrowser = isPlatformBrowser(this.platformId);
  public isAdmin = signal<boolean>(false);
  public isAuthenticated = signal<boolean>(false);
  public adminLang = signal<string | null>(null);
  public adminAction = signal<string | null>(null);
  public isDesktop = signal<boolean>(true);

  public prevLink = signal<string | null>(null);
  public nextLink = signal<string | null>(null);

  public coverData = signal<any>(null);
  public backCoverData = signal<any>(null);

  public login(password: string): boolean {
    if (password === '123') {
      this.isAuthenticated.set(true);
      if (this.isBrowser) {
        localStorage.setItem('admin_auth', 'true');
      }
      return true;
    }
    return false;
  }

  public logout() {
    this.isAuthenticated.set(false);
    if (this.isBrowser) {
      localStorage.removeItem('admin_auth');
    }
    this.router.navigate(['/admin/login']);
  }

  public isOnCover = computed(() => {
    this.bookService.pageCountsUpdated();
    const type = this.bookService.activePageType();
    const slug = this.bookService.activeChapterSlug() || '';
    const page = this.bookService.currentPageInChapter();

    // Na Home, a página 1 é a Capa que ocupa o spread total (livro fechado)
    if (type === PageType.Home && page === 1) return true;
    
    // No Exit, a última página é a contracapa
    if (type === PageType.Exit && page === this.bookService.getChapterPageCount(slug)) return true;

    return false;
  });

  public isGoingToCover = computed(() => {
    const type = this.bookService.activePageType();
    if (type !== PageType.Chapter) return false;

    const slug = this.bookService.activeChapterSlug() || '';
    const page = this.bookService.currentPageInChapter();
    const total = this.bookService.getChapterPageCount(slug);

    const routes = this.bookService.dynamicRouteOrder();
    const idx = routes.indexOf(slug);
    const metadata = this.bookService.routesMetadata();

    if (page === total && idx < routes.length - 1) {
      const nextSlug = routes[idx + 1];
      const nextMeta = metadata.find(m => m.slug === nextSlug);
      if (nextMeta?.type === PageType.Home || nextMeta?.type === PageType.Exit) return true;
    }

    if (page === 1 && idx > 0) {
      const prevSlug = routes[idx - 1];
      const prevMeta = metadata.find(m => m.slug === prevSlug);
      if (prevMeta?.type === PageType.Home || prevMeta?.type === PageType.Exit) return true;
    }

    return false;
  });

  /**
   * Log do estado actual da aplicação
   */
  public currentState = computed(() => {
    const slug = this.bookService.activeChapterSlug();
    const type = this.bookService.activePageType();
    const pageInChapter = this.bookService.currentPageInChapter();

    let absoluteColumnIndex = 0;
    if (type === PageType.Chapter) {
      const start = this.bookService.getStartingPage(slug) || 1;
      absoluteColumnIndex = start + pageInChapter - 1;
    }

    const spreadNumber = Math.ceil(absoluteColumnIndex / 2);

    return {
      page: absoluteColumnIndex,
      rightPage: spreadNumber * 2,
      leftPage: spreadNumber * 2 - 1,
      pageInChapter: pageInChapter,
      slug: slug,
      lang: this.i18n.currentLangCode(),
      type: type,
      isAdmin: this.isAdmin(),
      adminLang: this.adminLang(),
      adminAction: this.adminAction(),
      isOnCover: this.isOnCover(),
      isGoingToCover: this.isGoingToCover()
    };
  });

  constructor() {
    this.initNavigationListener();

    if (this.isBrowser) {
      this.isDesktop.set(window.innerWidth >= 768);
      this.isAuthenticated.set(localStorage.getItem('admin_auth') === 'true');
      window.addEventListener('resize', () => {
        this.isDesktop.set(window.innerWidth >= 768);
      });
    }

    effect(() => {
      if (isDevMode()) {
        // console.log('[Global State Update]:', this.currentState());
      }2
    });
  }

  private initNavigationListener() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const url = event.urlAfterRedirects.split('?')[0].split('#')[0];
      const slug = (url === '/' || url === '') ? '' : url.substring(1);

      this.isAdmin.set(url.startsWith('/admin'));

      const adminLangMatch = url.match(/\/admin\/([a-z]{2})(?:\/|$)/);
      if (adminLangMatch) {
        this.adminLang.set(adminLangMatch[1]);
        if (this.isBrowser) localStorage.setItem('lastAdminLang', adminLangMatch[1]);
      } else if (url === '/admin') {
        this.adminLang.set(null);
      } else if (url.startsWith('/admin/') && this.isBrowser) {
        const saved = localStorage.getItem('lastAdminLang');
        if (saved) this.adminLang.set(saved);
      }

      const actionMatch = url.match(/\/admin\/(create|update|read|delete)/);
      this.adminAction.set(actionMatch ? actionMatch[1] : null);

      this.bookService.activeChapterSlug.set(slug);

      let route = this.activatedRoute;
      while (route.firstChild) route = route.firstChild;
      const routeData = route.snapshot.data as CmsRouteData;
      if (routeData && routeData.type) {
        this.bookService.activePageType.set(routeData.type);
      }

      const routes = this.bookService.dynamicRouteOrder();
      let index = routes.indexOf(slug);

      if (index === -1) {
        const langRoute = this.i18n.currentLangCode() === 'pt' ? '' : this.i18n.currentLangCode();
        index = routes.indexOf(langRoute);
      }

      if (index === -1) {
        this.prevLink.set(null);
        this.nextLink.set(null);
        return;
      }

      this.prevLink.set(index > 0 ? '/' + routes[index - 1] : null);
      this.nextLink.set(index < routes.length - 1 ? '/' + routes[index + 1] : null);
    });
  }
}
