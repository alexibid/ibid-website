import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PageType } from '../models/page-type.enum';

@Injectable({
  providedIn: 'root'
})
export class BookService {
  private chapterPageCounts = new Map<string, number>();

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

  setRouteOrder(urls: string[]) {
    this.dynamicRouteOrder.set(urls);
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

  getStartingPage(slug: string): number {
    let startingPage = 1;
    for (const route of this.dynamicRouteOrder()) {
      if (route === slug) break;
      startingPage += this.chapterPageCounts.get(route) || 0;
    }
    return startingPage;
  }

  getTotalPages(): number {
    let total = 0;
    for (const route of this.dynamicRouteOrder()) {
      total += this.chapterPageCounts.get(route) || 0;
    }
    return total;
  }
}
