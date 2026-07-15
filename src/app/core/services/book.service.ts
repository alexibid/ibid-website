import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PageType } from '../../shared/types/page-type.enum';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BookService {
  private chapterPageCounts = new Map<string, number>();
  private routeTypes = new Map<string, PageType>();

  public pageCountsUpdated = signal<number>(0);
  public activeChapterSlug = signal<string>('');
  public activePageType = signal<PageType | null>(null);
  public currentChapterPage = signal<number>(1);
  public isFlipping = signal<boolean>(false);
  public flipDirection = signal<number>(1);
  public dynamicRouteOrder = signal<string[]>([]);
  public routesMetadata = signal<{ slug: string, title: string, type: PageType }[]>([]);

  public navigationRequest = new Subject<number>();

  triggerFlip(direction: number) {
    this.flipDirection.set(direction);
    this.isFlipping.set(true);
    setTimeout(() => {
      this.isFlipping.set(false);
    }, 900);
  }

  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  setRouteOrder(routes: { slug: string, title: string, type: PageType }[]) {
    const slugs = routes.map(r => r.slug);
    this.dynamicRouteOrder.set(slugs);
    this.routesMetadata.set(routes);

    this.routeTypes.clear();
    routes.forEach(r => this.routeTypes.set(r.slug, r.type));
  }

  setPageCount(slug: string, count: number) {
    if (this.chapterPageCounts.get(slug) !== count) {
      this.chapterPageCounts.set(slug, count);
      this.pageCountsUpdated.update(v => v + 1);
    }
  }

  getChapterPages(slug: string): number {
    return this.chapterPageCounts.get(slug) || 1;
  }

  getChapterIndex(slug: string): number {
    let index = 0;
    for (const route of this.dynamicRouteOrder()) {
      if (this.routeTypes.get(route) === PageType.Chapter) {
        index++;
      }
      if (route === slug) return index;
    }
    return index;
  }

  getStartingPage(slug: string): number {
    let startingPage = 1;
    for (const route of this.dynamicRouteOrder()) {
      if (route === slug) break;
      if (this.routeTypes.get(route) === PageType.Chapter) {
        startingPage += this.chapterPageCounts.get(route) || 1;
      }
    }
    return startingPage;
  }

  getTotalPages(): number {
    let total = 0;
    for (const route of this.dynamicRouteOrder()) {
      if (this.routeTypes.get(route) === PageType.Chapter) {
        total += this.chapterPageCounts.get(route) || 1;
      }
    }
    return total;
  }
}
