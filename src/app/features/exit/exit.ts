import { Component, OnDestroy, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Cover } from '../cover/cover';
import { PageType } from '../../shared/types/page-type.enum';
import { PocketbaseService } from '../../core/services/pocketbase.service';
import { I18nService } from '../../core/services/i18n.service';
import { StateService } from '../../core/services/state.service';
import { BookService } from '../../core/services/book.service';
import { BookNavigationDirective } from '../../shared/directives/book-navigation.directive';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { CmsPage } from '../../shared/types/cms.interface';

@Component({
  selector: 'app-exit',
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
export class Exit implements OnDestroy {
  private readonly nav = inject(BookNavigationDirective);
  private readonly bookService = inject(BookService);
  private readonly pbService = inject(PocketbaseService);
  private readonly i18n = inject(I18nService);
  public readonly stateService = inject(StateService);

  public readonly sections = signal<readonly CmsPage[]>([]);
  protected readonly needsBlankPage = signal<boolean>(false);

  constructor() {
    effect(() => {
      this.loadAllSections(this.i18n.currentLangCode());
    });
  }

  ngOnDestroy() {}

  private async loadAllSections(lang: string) {
    try {
      const records = await this.pbService.loadSections(PageType.Exit, lang);
      const structuralOrder = ['contact-form', 'about', 'back-cover'];
      records.sort((a, b) => {
        const locA = a.metadata?.location;
        const locB = b.metadata?.location;
        const orderA = locA && structuralOrder.indexOf(locA) !== -1 ? structuralOrder.indexOf(locA) : 99;
        const orderB = locB && structuralOrder.indexOf(locB) !== -1 ? structuralOrder.indexOf(locB) : 99;
        return orderA - orderB;
      });
      
      this.sections.set(records);
      
      if (this.stateService.isBrowser) {
        setTimeout(() => {
          this.nav.measurePage();
          this.nav.triggerScroll();
        }, 100);
      }
    } catch (error: unknown) {
      console.error('Failed to load sections for exit', error);
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

  public onSubmit(event: Event) {
    event.preventDefault();
    this.nav.hostEl.scrollTo({ left: this.nav.hostEl.scrollWidth, behavior: 'smooth' });
  }
}
