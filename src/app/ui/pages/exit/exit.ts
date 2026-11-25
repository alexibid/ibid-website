import { Component, OnInit, effect, inject, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Cover } from '../../components/cover/cover';
import { BookNavigationDirective } from '../../directives/book-navigation.directive';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { ContactFacade } from '../../../application/facades/contact.facade';
import { BookService } from '../../../infrastructure/services/book.service';
import { I18nService } from '../../../infrastructure/services/i18n.service';
import { RoutingService } from '../../../infrastructure/services/routing.service';
import { CONTENT_READ_REPOSITORY } from '../../../infrastructure/tokens/content-repository.token';
import {
  type BookPaginationDeps,
  syncAllChapterPageCounts
} from '../../components/layout/footer/footer';
import { estimateChapterPageCount } from '../chapter/chapter';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'website-exit',
  standalone: true,
  imports: [CommonModule, Cover, TranslatePipe],
  templateUrl: './exit.html',
  styleUrl: './exit.scss',
  hostDirectives: [{
    directive: BookNavigationDirective,
    outputs: ['pageMeasured']
  }],
  host: {
    '(pageMeasured)': 'onPageMeasured($event)'
  }
})
export class Exit implements OnInit {
  public readonly lang = input<string>();
  public readonly facade = inject(ContactFacade);
  private readonly nav = inject(BookNavigationDirective);
  private readonly bookService = inject(BookService);
  private readonly i18n = inject(I18nService);
  private readonly routingService = inject(RoutingService);
  private readonly contentRepo = inject(CONTENT_READ_REPOSITORY);

  protected readonly needsBlankPage = this.nav.needsBlankPage.asReadonly();

  constructor() {
    effect(() => {
      const lang = this.lang() || this.i18n.currentLangCode();
      void this.facade.loadExitSections(lang);
    });

    effect(() => {
      const order = this.bookService.dynamicRouteOrder();
      const sections = this.facade.sections();
      const isDesktop = this.facade.stateService.isDesktop();
      if (order.length > 0 && sections.length > 0 && this.facade.stateService.isBrowser) {
        void syncAllChapterPageCounts(
          this.nav.hostEl,
          this.paginationDeps(isDesktop),
          estimateChapterPageCount
        );
      }
    });

    effect((onCleanup) => {
      const sections = this.facade.sections();
      if (sections.length > 0 && this.facade.stateService.isBrowser) {
        this.nav.resetBlankPage();
        const timerId = setTimeout(() => {
          if (!this.nav.hasFragment) {
            this.nav.scrollToStart();
          } else {
            this.nav.triggerScroll();
          }
          this.nav.measurePage();
        }, 100);
        onCleanup(() => clearTimeout(timerId));
      }
    });
  }

  ngOnInit(): void {
    this.facade.loadRecaptchaScript();
  }

  protected onPageMeasured(totalCols: number): void {
    this.facade.setPageCount(this.nav.currentSlug, totalCols);
    void syncAllChapterPageCounts(
      this.nav.hostEl,
      this.paginationDeps(this.facade.stateService.isDesktop()),
      estimateChapterPageCount
    );
  }

  public async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    const success = await this.facade.submit();
    if (success) {
      this.nav.hostEl.scrollTo({ left: this.nav.hostEl.scrollWidth, behavior: 'smooth' });
    }
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
