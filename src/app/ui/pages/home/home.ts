import { Component, computed, effect, inject, input, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BookFacade } from '../../../application/facades/book.facade';
import { I18nService } from '../../../infrastructure/services/i18n.service';
import { StateService } from '../../../application/state/state.service';
import { BookService } from '../../../infrastructure/services/book.service';
import { RoutingService } from '../../../infrastructure/services/routing.service';
import { CONTENT_READ_REPOSITORY } from '../../../infrastructure/tokens/content-repository.token';
import {
  type BookPaginationDeps,
  syncAllChapterPageCounts
} from '../../components/layout/footer/footer';
import { estimateChapterPageCount } from '../chapter/chapter';
import { BookNavigationDirective } from '../../directives/book-navigation.directive';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { StaticHtmlDirective } from '../../directives/static-html.directive';
import { Cover } from '../../components/cover/cover';

const INDEX_LOCATION = 'index';
const INDEX_SECTION_ID = 'menu';
const COVER_TO_INDEX_DELAY_MS = 5000;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'website-home',
  standalone: true,
  imports: [RouterLink, TranslatePipe, Cover, StaticHtmlDirective],
  templateUrl: './home.html',
  hostDirectives: [{
    directive: BookNavigationDirective,
    outputs: ['pageMeasured']
  }],
  host: {
    class: 'book-page',
    '(pageMeasured)': 'onPageMeasured($event)'
  }
})
export class Home {
  public readonly lang = input<string>();
  public readonly location = input<string>();
  private readonly nav = inject(BookNavigationDirective);
  public readonly bookService = inject(BookService);
  public readonly facade = inject(BookFacade);
  private readonly i18n = inject(I18nService);
  private readonly routingService = inject(RoutingService);
  private readonly contentRepo = inject(CONTENT_READ_REPOSITORY);
  public readonly stateService = inject(StateService);

  public readonly sections = this.facade.sections;
  protected readonly needsBlankPage = this.nav.needsBlankPage.asReadonly();
  protected readonly isIndexPage = computed(() => this.location() === INDEX_LOCATION);

  public previousUrl(): void {
    this.nav.handleNavigation(-1);
  }

  constructor() {
    effect(() => {
      const lang = this.i18n.currentLangCode();
      void this.facade.loadHomeSections(lang);
    });

    effect(() => {
      const order = this.bookService.dynamicRouteOrder();
      const sections = this.sections();
      const isDesktop = this.stateService.isDesktop();
      if (order.length > 0 && sections.length > 0 && this.stateService.isBrowser) {
        void syncAllChapterPageCounts(
          this.nav.hostEl,
          this.paginationDeps(isDesktop),
          estimateChapterPageCount
        );
      }
    });

    effect((onCleanup) => {
      const sections = this.sections();
      if (sections.length > 0 && this.stateService.isBrowser) {
        this.nav.resetBlankPage();
        const timerId = setTimeout(() => {
          if (!this.nav.hasFragment) {
            if (this.nav.isTurningBack() && !this.stateService.isDesktop()) {
              this.nav.hostEl.scrollTo({ left: this.nav.hostEl.scrollWidth, behavior: 'instant' });
            } else {
              this.nav.scrollToStart();
            }
          } else {
            this.nav.triggerScroll();
          }
          this.nav.measurePage();
        }, 100);
        onCleanup(() => clearTimeout(timerId));
      }
    });

    this.scheduleIndexReveal();
  }

  private scheduleIndexReveal(): void {
    effect((onCleanup) => {
      if (!this.isIndexPage() || this.sections().length === 0 || !this.stateService.isBrowser) return;
      const timerId = this.bookService.indexRevealRequested()
        ? setTimeout(() => this.revealRequestedIndex())
        : setTimeout(() => this.nav.revealSectionFromCover(INDEX_SECTION_ID), COVER_TO_INDEX_DELAY_MS);
      onCleanup(() => clearTimeout(timerId));
    });
  }

  private revealRequestedIndex(): void {
    this.bookService.indexRevealRequested.set(false);
    this.nav.revealSection(INDEX_SECTION_ID);
  }

  protected onPageMeasured(totalCols: number): void {
    this.bookService.setPageCount(this.nav.currentSlug, totalCols);
    void syncAllChapterPageCounts(
      this.nav.hostEl,
      this.paginationDeps(this.stateService.isDesktop()),
      estimateChapterPageCount
    );
  }

  private paginationDeps(isDesktop: boolean): BookPaginationDeps {
    return {
      bookService: this.bookService,
      routingService: this.routingService,
      contentRepo: this.contentRepo,
      isDesktop
    };
  }
}
