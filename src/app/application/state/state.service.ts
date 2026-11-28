import { Injectable, OnDestroy, computed, effect, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, ActivatedRoute, NavigationEnd, type NavigationExtras } from '@angular/router';
import { filter } from 'rxjs/operators';
import {
  BookService, type EstimateOptions, buildPaginationViewportKey, preloadChapterImageSizes,
  readStoredPageCounts, writeStoredPageCounts
} from '../../infrastructure/services/book.service';
import { I18nService } from '../../infrastructure/services/i18n.service';
import { RoutingService } from '../../infrastructure/services/routing.service';
import { PageType } from '../../domain/models/page-type.enum';
import { CmsPage, type CmsRouteData } from '../../domain/models/cms.interface';
import type {
  ContentReadRepository, ContentRequestOptions
} from '../../domain/repositories/content.repository';
import { isPageType } from '../../domain/models/static-routes.model';
import { afterPageLoadIdle } from './page-idle';

export type BookPaginationDeps = {
  readonly bookService: BookService; readonly routingService: RoutingService;
  readonly contentRepo: ContentReadRepository; readonly isDesktop: boolean;
};

export type ChapterEstimator = (host: HTMLElement, page: CmsRouteData, options: EstimateOptions) => number;

const chapterCountCache = new Map<string, Map<string, number>>();
const domMeasuredKeys = new Set<string>();
let syncEpoch = 0;
const BACKGROUND_REQUEST: ContentRequestOptions = { priority: 'low' };

function listChapterSlugs(deps: BookPaginationDeps): readonly string[] {
  return deps.bookService.dynamicRouteOrder().filter(slug => deps.routingService.hasPage(slug, PageType.Chapter));
}

function buildChapterViewportKey(host: HTMLElement, deps: BookPaginationDeps, slugs: readonly string[]): string {
  const signature = slugs.map(slug => {
    const page = deps.routingService.getPage(slug);
    return `${slug}:${page.pageId}:${page.title.length}:${page.content.length}`;
  }).join('|');
  return buildPaginationViewportKey(host, { isDesktop: deps.isDesktop, signature });
}

async function loadChapterPages(slugs: readonly string[], deps: BookPaginationDeps): Promise<readonly { readonly slug: string; readonly page: CmsRouteData }[]> {
  await afterPageLoadIdle();
  return Promise.all(slugs.map(async slug => {
    const basePage = deps.routingService.getPage(slug);
    if (basePage.content !== '') return { slug, page: basePage };
    const fullPage = await deps.contentRepo.getPage(basePage.pageId, BACKGROUND_REQUEST);
    return { slug, page: { ...basePage, title: fullPage.title || basePage.title, content: fullPage.content } };
  }));
}

function scheduleFontResync(host: HTMLElement, deps: BookPaginationDeps, context: { readonly epoch: number; readonly estimate: ChapterEstimator }): void {
  if (!document.fonts || document.fonts.status === 'loaded') return;
  void document.fonts.ready.then(() => {
    if (context.epoch === syncEpoch && host.isConnected && document.fonts.status === 'loaded') {
      void syncAllChapterPageCounts(host, deps, context.estimate);
    }
  });
}

export async function syncAllChapterPageCounts(host: HTMLElement, deps: BookPaginationDeps, estimate: ChapterEstimator): Promise<void> {
  const slugs = host.clientWidth > 0 && host.clientHeight > 0 ? listChapterSlugs(deps) : [];
  if (slugs.length === 0) return;
  const initialKey = buildChapterViewportKey(host, deps, slugs);
  const cached = chapterCountCache.get(initialKey) ?? readStoredPageCounts(initialKey);
  if (slugs.every(slug => cached.has(slug))) {
    chapterCountCache.set(initialKey, cached);
    slugs.forEach(slug => deps.bookService.setPageCount(slug, cached.get(slug) ?? 1));
    return;
  }
  const epoch = ++syncEpoch;
  const pages = await loadChapterPages(slugs, deps);
  const fontsReady = document.fonts?.ready ?? Promise.resolve();
  const [, imageSizes] = await Promise.all([
    Promise.race([fontsReady, new Promise(resolve => setTimeout(resolve, 250))]),
    preloadChapterImageSizes(pages.map(entry => entry.page.content))
  ]);
  if (epoch !== syncEpoch) return;
  scheduleFontResync(host, deps, { epoch, estimate });
  const key = buildChapterViewportKey(host, deps, slugs);
  const nextCache = new Map<string, number>();
  const options: EstimateOptions = { isDesktop: deps.isDesktop, imageSizes };
  for (const { slug, page } of pages) {
    const measured = domMeasuredKeys.has(`${key}\0${slug}`);
    const count = measured ? deps.bookService.getChapterPages(slug) : estimate(host, page, options);
    nextCache.set(slug, count);
    if (!measured) deps.bookService.setPageCount(slug, count);
  }
  chapterCountCache.set(key, nextCache);
  writeStoredPageCounts(key, nextCache);
}

export function recordMeasuredChapterPage(
  host: HTMLElement, deps: BookPaginationDeps, entry: { readonly slug: string; readonly totalCols: number }
): void {
  if (host.clientWidth <= 0 || host.clientHeight <= 0) return;
  const slugs = listChapterSlugs(deps);
  if (!slugs.includes(entry.slug)) return;
  const key = buildChapterViewportKey(host, deps, slugs);
  domMeasuredKeys.add(`${key}\0${entry.slug}`);
  const counts = chapterCountCache.get(key) ?? readStoredPageCounts(key);
  counts.set(entry.slug, entry.totalCols);
  chapterCountCache.set(key, counts);
  writeStoredPageCounts(key, counts);
}

@Injectable({
  providedIn: 'root'
})
export class StateService implements OnDestroy {
  private readonly bookService = inject(BookService);
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router, { optional: true });
  private readonly activatedRoute = inject(ActivatedRoute, { optional: true });
  private readonly platformId = inject(PLATFORM_ID);
  private navigationTimer: ReturnType<typeof setTimeout> | undefined;

  public readonly isBrowser = isPlatformBrowser(this.platformId);
  public readonly isAdmin = signal<boolean>(false);
  public readonly adminLang = signal<string | null>(null);
  public readonly adminAction = signal<string | null>(null);
  public readonly isDesktop = signal<boolean>(true);
  public readonly isTransitioning = signal<boolean>(false);

  public readonly prevLink = signal<string | null>(null);
  public readonly nextLink = signal<string | null>(null);

  public readonly coverData = signal<CmsPage | null>(null);
  public readonly backCoverData = signal<CmsPage | null>(null);

  public readonly isDesktopCoverStage = computed(
    () => this.isDesktop() && this.bookService.activePageType() === PageType.Home
  );

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
    this.bookService.pageCountsUpdated();
    const type = this.bookService.activePageType();
    if (type !== PageType.Chapter) return false;
    const [slug, page] = [this.bookService.activeChapterSlug() || '', this.bookService.currentChapterPage()];
    const total = this.bookService.getChapterPages(slug);
    const routes = this.bookService.dynamicRouteOrder();
    const routeIndex = routes.indexOf(slug);
    const metadata = this.bookService.routesMetadata();
    if (page === total && routeIndex < routes.length - 1) {
      const nextMeta = metadata.find(entry => entry.slug === routes[routeIndex + 1]);
      if (nextMeta?.type === PageType.Home || nextMeta?.type === PageType.Exit) return true;
    }
    if (page === 1 && routeIndex > 0) {
      const prevMeta = metadata.find(entry => entry.slug === routes[routeIndex - 1]);
      if (prevMeta?.type === PageType.Home || prevMeta?.type === PageType.Exit) return true;
    }
    return false;
  });

  public readonly currentState = computed(() => {
    this.bookService.pageCountsUpdated();
    const [slug, type, pageInChapter] = [
      this.bookService.activeChapterSlug(),
      this.bookService.activePageType(),
      this.bookService.currentChapterPage()
    ];
    const absoluteColumnIndex = type === PageType.Chapter
      ? (this.bookService.getStartingPage(slug) || 1) + pageInChapter - 1
      : 0;
    const spreadNumber = Math.ceil(absoluteColumnIndex / 2);
    return {
      page: absoluteColumnIndex, rightPage: spreadNumber * 2, leftPage: spreadNumber * 2 - 1,
      pageInChapter, slug, lang: this.i18n.currentLangCode(), type, isAdmin: this.isAdmin(),
      adminLang: this.adminLang(), adminAction: this.adminAction(),
      isOnCover: this.isOnCover(), isGoingToCover: this.approachingCover()
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

  ngOnDestroy(): void {
    this.cancelScheduledNavigation();
  }

  public resolveSlugFromUrl(rawUrl: string): string {
    return rawUrl.split(/[?#]/)[0].replace(/^\/+|\/+$/g, '');
  }

  public cancelScheduledNavigation(): void {
    clearTimeout(this.navigationTimer);
    this.navigationTimer = undefined;
    this.isTransitioning.set(false);
  }

  public navigateWithFlip(targetUrl: string, direction: number, extras?: NavigationExtras): void {
    clearTimeout(this.navigationTimer);
    this.isTransitioning.set(true);
    this.bookService.triggerFlip(direction);
    this.navigationTimer = setTimeout(() => {
      this.navigationTimer = undefined;
      const navPromise = extras ? this.router?.navigate([targetUrl], extras) : this.router?.navigate([targetUrl]);
      void Promise.resolve(navPromise).catch(() => false).finally(() => this.isTransitioning.set(false));
    }, 450);
  }

  public syncAllChapterPageCounts(host: HTMLElement, deps: BookPaginationDeps, estimate: ChapterEstimator): Promise<void> {
    return syncAllChapterPageCounts(host, deps, estimate);
  }

  public recordMeasuredChapterPage(host: HTMLElement, deps: BookPaginationDeps, entry: { readonly slug: string; readonly totalCols: number }): void {
    recordMeasuredChapterPage(host, deps, entry);
  }

  private updateNavigationLinks(routes: readonly string[], slug: string, langRoute: string): void {
    let index = routes.indexOf(slug);
    if (index === -1) index = routes.indexOf(langRoute);
    if (index === -1) {
      this.prevLink.set(null);
      this.nextLink.set(null);
      return;
    }
    this.prevLink.set(index > 0 ? '/' + routes[index - 1] : null);
    this.nextLink.set(index < routes.length - 1 ? '/' + routes[index + 1] : null);
  }

  private initNavigationListener(): void {
    if (!this.router) return;
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.cancelScheduledNavigation();
        const slug = this.resolveSlugFromUrl(event.urlAfterRedirects);
        const url = slug ? '/' + slug : '/';

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
        if (isPageType(routeType)) this.bookService.activePageType.set(routeType);

        const routeLang: unknown = route?.snapshot.data['lang'];
        if (!url.startsWith('/admin') && typeof routeLang === 'string' && routeLang !== this.i18n.currentLangCode()) {
          this.i18n.setLanguage(routeLang);
        }

        this.updateNavigationLinks(this.bookService.dynamicRouteOrder(), slug, this.i18n.currentLangCode());
      });
  }
}
