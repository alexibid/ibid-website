import { Component, OnDestroy, OnInit, effect, inject, signal, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Cover } from '../../../shared/components/cover/cover';
import { BookNavigationDirective } from '../../../shared/directives/book-navigation.directive';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { ContactFacade } from '../contact.facade';

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
export class Exit implements OnInit, OnDestroy {
  public readonly lang = input<string>();
  public readonly facade = inject(ContactFacade);
  private readonly nav = inject(BookNavigationDirective);

  protected readonly needsBlankPage = signal<boolean>(false);

  constructor() {
    effect(() => {
      const lang = this.lang() || 'pt';
      this.facade.loadExitSections(lang);
    });

    effect(() => {
      const sections = this.facade.sections();
      if (sections.length > 0 && this.facade.stateService.isBrowser) {
        setTimeout(() => {
          this.nav.measurePage();
          this.nav.triggerScroll();
        }, 100);
      }
    });
  }

  ngOnInit() {
    this.facade.loadRecaptchaScript();
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
    this.facade.setPageCount(this.nav.currentSlug, totalCols);
  }

  public async onSubmit(event: Event) {
    event.preventDefault();
    const success = await this.facade.submit();
    if (success) {
      this.nav.hostEl.scrollTo({ left: this.nav.hostEl.scrollWidth, behavior: 'smooth' });
    }
  }
}
