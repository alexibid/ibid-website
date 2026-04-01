import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PageType } from '../models/page-type.enum';

@Injectable({
  providedIn: 'root'
})
export class BookService {
  private chapterPageCounts = new Map<string, number>();
  private routeTypes = new Map<string, PageType>();

  public pageCountsUpdated = signal<number>(0);
  public activeChapterSlug = signal<string>('');
  public activePageType = signal<PageType | null>(null);
  public currentPageInChapter = signal<number>(1);

  public isFlipping = signal<boolean>(false);
  public flipDirection = signal<number>(1);

  // Array of valid slugs in the book, in reading order
  // Includes '' (home) and 'contactos' (exit) or whatever the CMS dictates
  public dynamicRouteOrder = signal<string[]>([]);

  triggerFlip(direction: number) {
    this.flipDirection.set(direction);
    this.isFlipping.set(true);
    setTimeout(() => {
      this.isFlipping.set(false);
    }, 900); // from Codepen transition timing
  }

  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  setRouteOrder(routes: { slug: string, type: PageType }[]) {
    const slugs = routes.map(r => r.slug);
    this.dynamicRouteOrder.set(slugs);
    
    this.routeTypes.clear();
    routes.forEach(r => this.routeTypes.set(r.slug, r.type));
  }

  setPageCount(slug: string, count: number) {
    if (this.chapterPageCounts.get(slug) !== count) {
      this.chapterPageCounts.set(slug, count);
      this.pageCountsUpdated.update(v => v + 1);
    }
  }

  getChapterPageCount(slug: string): number {
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
      // Só somar se for um Chapter
      if (this.routeTypes.get(route) === PageType.Chapter) {
        startingPage += this.chapterPageCounts.get(route) || 1; // Default to 1 if not measured yet
      }
    }
    return startingPage;
  }

  getTotalPages(): number {
    let total = 0;
    for (const route of this.dynamicRouteOrder()) {
      if (this.routeTypes.get(route) === PageType.Chapter) {
        total += this.chapterPageCounts.get(route) || 1; // Default to 1
      }
    }
    return total;
  }
}
