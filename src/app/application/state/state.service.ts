import { Injectable, computed, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { BookService } from '../../infrastructure/services/book.service';
import { I18nService } from '../../infrastructure/services/i18n.service';
import { CONTENT_REPOSITORY } from '../../infrastructure/tokens/content-repository.token';
import { PageType } from '../../domain/models/page-type.enum';
import { CmsPage, CmsRouteData } from '../../domain/models/cms.interface';

@Injectable({
  providedIn: 'root'
})
export class StateService {
  private bookService = inject(BookService);
  private i18n = inject(I18nService);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private platformId = inject(PLATFORM_ID);
  public contentRepo = inject(CONTENT_REPOSITORY);

  public isBrowser = isPlatformBrowser(this.platformId);
  public isAdmin = signal<boolean>(false);
  public isAuthenticated = signal<boolean>(false);
  public adminLang = signal<string | null>(null);
  public adminAction = signal<string | null>(null);
  public isDesktop = signal<boolean>(true);

  public prevLink = signal<string | null>(null);
  public nextLink = signal<string | null>(null);

  public coverData = signal<CmsPage | null>(null);
  public backCoverData = signal<CmsPage | null>(null);

  public async login(password: string): Promise<boolean> {
    const success = await this.contentRepo.login(password);
    if (success) {
      this.isAuthenticated.set(true);
      return true;
    }
    return false;
  }

  public logout(): void {
    this.isAuthenticated.set(false);
    this.router.navigate(['/admin/login']);
  }

  public isOnCover = computed(() => {
    this.bookService.pageCountsUpdated();
    const type = this.bookService.activePageType();
    const slug = this.bookService.activeChapterSlug() || '';
    const page = this.bookService.currentChapterPage();

    if (type === PageType.Home && page === 1) return true;
    
    if (type === PageType.Exit) {
      const total = this.bookService.getChapterPages(slug);
      return this.isDesktop() ? (page >= total - 1) : (page === total);
    }

    return false;
  });

  public approachingCover = computed(() => {
    const type = this.bookService.activePageType();
    if (type !== PageType.Chapter) return false;

    const slug = this.bookService.activeChapterSlug() || '';
    const page = this.bookService.currentChapterPage();
    const total = this.bookService.getChapterPages(slug);

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

  public currentState = computed(() => {
    const slug = this.bookService.activeChapterSlug();
    const type = this.bookService.activePageType();
    const pageInChapter = this.bookService.currentChapterPage();

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
      isGoingToCover: this.approachingCover()
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
  }

  private initNavigationListener() {
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event) => {
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
        const langRoute = this.i18n.currentLangCode();
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
