import { Injectable, computed, effect, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { BookService } from '../../infrastructure/services/book.service';
import { I18nService } from '../../infrastructure/services/i18n.service';
import { PageType } from '../../domain/models/page-type.enum';
import { CmsPage } from '../../domain/models/cms.interface';
import { isPageType } from '../../domain/models/static-routes.model';

@Injectable({
  providedIn: 'root'
})
export class StateService {
  private readonly bookService = inject(BookService);
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router, { optional: true });
  private readonly activatedRoute = inject(ActivatedRoute, { optional: true });
  private readonly platformId = inject(PLATFORM_ID);

  public readonly isBrowser = isPlatformBrowser(this.platformId);
  public readonly isAdmin = signal<boolean>(false);
  public readonly adminLang = signal<string | null>(null);
  public readonly adminAction = signal<string | null>(null);
  public readonly isDesktop = signal<boolean>(true);

  public readonly prevLink = signal<string | null>(null);
  public readonly nextLink = signal<string | null>(null);

  public readonly coverData = signal<CmsPage | null>(null);
  public readonly backCoverData = signal<CmsPage | null>(null);

  public readonly isOnCover = computed(() => {
    this.bookService.pageCountsUpdated();
    const type = this.bookService.activePageType();
    const slug = this.bookService.activeChapterSlug() || '';
    const page = this.bookService.currentChapterPage();

    if (type === PageType.Home && page === 1) return true;

    if (type === PageType.Exit) {
      const total = this.bookService.getChapterPages(slug);
      return this.isDesktop() ? page >= total - 1 : page === total;
    }

    return false;
  });

  public readonly approachingCover = computed(() => {
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
      const nextMeta = metadata.find((m) => m.slug === nextSlug);
      if (nextMeta?.type === PageType.Home || nextMeta?.type === PageType.Exit) return true;
    }

    if (page === 1 && idx > 0) {
      const prevSlug = routes[idx - 1];
      const prevMeta = metadata.find((m) => m.slug === prevSlug);
      if (prevMeta?.type === PageType.Home || prevMeta?.type === PageType.Exit) return true;
    }

    return false;
  });

  public readonly currentState = computed(() => {
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
      pageInChapter,
      slug,
      lang: this.i18n.currentLangCode(),
      type,
      isAdmin: this.isAdmin(),
      adminLang: this.adminLang(),
      adminAction: this.adminAction(),
      isOnCover: this.isOnCover(),
      isGoingToCover: this.approachingCover()
    };
  });

  constructor() {
    this.initNavigationListener();

    effect(() => {
      this.updateNavigationLinks(
        this.bookService.dynamicRouteOrder(),
        this.bookService.activeChapterSlug(),
        this.i18n.currentLangCode()
      );
    });

    if (this.isBrowser) {
      this.isDesktop.set(window.innerWidth >= 768);
      window.addEventListener('resize', () => {
        this.isDesktop.set(window.innerWidth >= 768);
      });
    }
  }

  private updateNavigationLinks(routes: readonly string[], slug: string, langRoute: string): void {
    let index = routes.indexOf(slug);
    if (index === -1) {
      index = routes.indexOf(langRoute);
    }
    if (index === -1) {
      this.prevLink.set(null);
      this.nextLink.set(null);
      return;
    }
    this.prevLink.set(index > 0 ? '/' + routes[index - 1] : null);
    this.nextLink.set(index < routes.length - 1 ? '/' + routes[index + 1] : null);
  }

  private initNavigationListener(): void {
    if (!this.router) {
      return;
    }
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        const rawUrl = event.urlAfterRedirects.split('?')[0].split('#')[0];
        const url = rawUrl.replace(/\/+$/, '') || '/';
        const slug = url === '/' ? '' : url.substring(1);

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

        let route = this.activatedRoute ?? this.router?.routerState?.root ?? null;
        while (route?.firstChild) route = route.firstChild;
        const routeType = route?.snapshot.data['type'];
        if (isPageType(routeType)) {
          this.bookService.activePageType.set(routeType);
        }

        this.updateNavigationLinks(
          this.bookService.dynamicRouteOrder(),
          slug,
          this.i18n.currentLangCode()
        );
      });
  }
}
