import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { BookService } from '../../../../infrastructure/services/book.service';
import { RoutingService } from '../../../../infrastructure/services/routing.service';
import { I18nService } from '../../../../infrastructure/services/i18n.service';
import { PageType } from '../../../../domain/models/page-type.enum';
import { PageLocation } from '../../../../domain/models/cms.interface';

interface BookmarkDestination {
  readonly path: string;
  readonly title: string;
  readonly chapterNumeral: string;
  readonly accessibleName: string;
  readonly isIndex: boolean;
}

const INDEX_LOCATION: PageLocation = 'index';
const NO_CHAPTER = '';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'website-bookmark-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './bookmark-nav.html',
  host: {
    class: 'bookmark-nav-anchor'
  }
})
export class BookmarkNav {
  public readonly isOpen = input.required<boolean>();
  public readonly destinationChosen = output<void>();

  private readonly bookService = inject(BookService);
  private readonly routingService = inject(RoutingService);
  private readonly i18n = inject(I18nService);

  protected readonly exactMatch = { exact: true } as const;
  protected readonly indexDestinations = computed(() => this.findIndex(this.i18n.currentLangCode()));
  protected readonly indexTitle = computed(() => this.indexDestinations()[0]?.title ?? '');
  protected readonly destinations = computed(() => [
    ...this.indexDestinations(),
    ...this.findBookPages()
  ]);

  protected chooseDestination(destination: BookmarkDestination): void {
    this.bookService.indexRevealRequested.set(destination.isIndex);
    this.destinationChosen.emit();
  }

  private findBookPages(): readonly BookmarkDestination[] {
    return this.bookService
      .routesMetadata()
      .filter((route) => route.type !== PageType.Home)
      .map((route) => this.toPageDestination(route.title, route.slug, route.type));
  }

  private toPageDestination(title: string, slug: string, type: PageType): BookmarkDestination {
    const chapterNumeral = this.chapterNumeralOf(slug, type);
    return {
      path: '/' + slug,
      title,
      chapterNumeral,
      accessibleName: chapterNumeral ? `${chapterNumeral} ${title}` : title,
      isIndex: false
    };
  }

  private chapterNumeralOf(slug: string, type: PageType): string {
    return type === PageType.Chapter ? this.routingService.getPage(slug).metadata?.location ?? NO_CHAPTER : NO_CHAPTER;
  }

  private findIndex(lang: string): readonly BookmarkDestination[] {
    if (this.bookService.routesMetadata().length === 0) return [];
    const links = this.routingService.translationMap.get(INDEX_LOCATION) ?? [];
    return links
      .filter((link) => link.lang === lang)
      .map((link) => link.url.slice(1))
      .filter((key) => this.routingService.hasPage(key, PageType.Home))
      .map((key) => this.toIndexDestination(key));
  }

  private toIndexDestination(key: string): BookmarkDestination {
    const title = this.routingService.getPage(key).title;
    return { path: '/' + key, title, chapterNumeral: NO_CHAPTER, accessibleName: title, isIndex: true };
  }
}
