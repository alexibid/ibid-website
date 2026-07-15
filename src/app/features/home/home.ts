import { Component, OnDestroy, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageType } from '../../shared/types/page-type.enum';
import { PocketbaseService } from '../../core/services/pocketbase.service';
import { I18nService } from '../../core/services/i18n.service';
import { StateService } from '../../core/services/state.service';
import { BookService } from '../../core/services/book.service';
import { BookNavigationDirective } from '../../shared/directives/book-navigation.directive';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { Cover } from '../cover/cover';
import { CmsPage } from '../../shared/types/cms.interface';
import { locationToInt } from '../../shared/utils/location.utils';

@Component({
  selector: 'app-home',
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
  private readonly nav = inject(BookNavigationDirective);
  public readonly bookService = inject(BookService);
  private readonly pbService = inject(PocketbaseService);
  private readonly i18n = inject(I18nService);
  public readonly stateService = inject(StateService);

  public readonly sections = signal<readonly CmsPage[]>([]);
  protected readonly needsBlankPage = signal<boolean>(false);

  public previousUrl() {
    this.nav.handleNavigation(-1);
  }

  constructor() {
    effect(() => {
      const lang = this.i18n.currentLangCode();
      this.loadAllSections(lang);
    });

    effect(() => {
      const sections = this.sections();
      const frontCover = sections.find(s => s.metadata?.location === 'front-cover');
      if (frontCover) {
        this.stateService.coverData.set(frontCover);
      }

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

  private async loadAllSections(lang: string) {
    try {
      const records = await this.pbService.loadSections(PageType.Home, lang);
      records.sort((a, b) => {
        const orderA = locationToInt(a.metadata?.location);
        const orderB = locationToInt(b.metadata?.location);
        return orderA - orderB;
      });
      this.sections.set(records);
    } catch (error: unknown) {
      console.error('Failed to load sections for home', error);
    }
  }

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
