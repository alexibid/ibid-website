import { Component, OnDestroy, effect, inject, signal, input, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BookFacade } from '../../../application/facades/book.facade';
import { I18nService } from '../../../infrastructure/services/i18n.service';
import { StateService } from '../../../application/state/state.service';
import { BookService } from '../../../infrastructure/services/book.service';
import { BookNavigationDirective } from '../../directives/book-navigation.directive';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { Cover } from '../../components/cover/cover';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'website-home',
  standalone: true,
  imports: [RouterLink, TranslatePipe, Cover],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  hostDirectives: [{
    directive: BookNavigationDirective,
    outputs: ['pageMeasured']
  }],
  host: {
    '(pageMeasured)': 'onPageMeasured($event)'
  }
})
export class Home implements OnDestroy {
  public readonly lang = input<string>();
  private readonly nav = inject(BookNavigationDirective);
  public readonly bookService = inject(BookService);
  public readonly facade = inject(BookFacade);
  private readonly i18n = inject(I18nService);
  public readonly stateService = inject(StateService);

  public readonly sections = this.facade.sections;
  protected readonly needsBlankPage = signal<boolean>(false);

  public previousUrl() {
    this.nav.handleNavigation(-1);
  }

  constructor() {
    effect(() => {
      const lang = this.i18n.currentLangCode();
      this.facade.loadHomeSections(lang);
    });

    effect(() => {
      const sections = this.sections();
      if (sections.length > 0 && this.stateService.isBrowser) {
        this.needsBlankPage.set(false);
        setTimeout(() => {
          if (!this.nav.currentSlug) {
            this.nav.scrollToStart();
          } else {
            this.nav.triggerScroll();
          }
          this.nav.measurePage();
        }, 100);
      }
    });
  }

  ngOnDestroy() {}

  protected onPageMeasured(totalCols: number) {
    const isDesktop = window.innerWidth >= 768;
    if (isDesktop) {
      const colsWithoutBlank = this.needsBlankPage() ? (totalCols - 1) : totalCols;
      const naturalIsOdd = colsWithoutBlank % 2 !== 0;
      if (naturalIsOdd !== this.needsBlankPage()) {
        this.needsBlankPage.set(naturalIsOdd);
        setTimeout(() => this.nav.measurePage(), 50);
        return;
      }
    }
    this.bookService.setPageCount(this.nav.currentSlug, totalCols);
  }
}
