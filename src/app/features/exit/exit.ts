import { Component, OnDestroy, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Cover } from '../cover/cover';
import { PageType } from '../../shared/types/page-type.enum';
import { BasePage } from '../../core/base/base-page';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-exit',
  standalone: true,
  imports: [CommonModule, Cover, TranslatePipe],
  templateUrl: './exit.html',
  styleUrl: './exit.scss',
})
export class Exit extends BasePage implements OnDestroy {
  protected readonly needsBlankPage = signal<boolean>(false);

  constructor() {
    super();
    effect(() => {
      const structuralOrder = ['contact-form', 'about', 'back-cover'];
      const sortFn = (a: any, b: any) => {
        const locA = a['metadata']?.['location'];
        const locB = b['metadata']?.['location'];
        const orderA = structuralOrder.indexOf(locA) !== -1 ? structuralOrder.indexOf(locA) : 99;
        const orderB = structuralOrder.indexOf(locB) !== -1 ? structuralOrder.indexOf(locB) : 99;
        return orderA - orderB;
      };
      this.loadAllSections(PageType.Exit, this.i18n.currentLangCode(), sortFn);
    });
  }

  protected override onPageMeasured(totalCols: number) {
    const isDesktop = window.innerWidth >= 768;
    if (isDesktop) {
      const colsWithoutBlank = this.needsBlankPage() ? (totalCols - 1) : totalCols;
      const naturalIsOdd = colsWithoutBlank % 2 !== 0;
      if (naturalIsOdd !== this.needsBlankPage()) {
        this.needsBlankPage.set(naturalIsOdd);
        setTimeout(() => this.measurePage(), 50);
        return;
      }
    }
    super.onPageMeasured(totalCols);
  }

  public onSubmit(event: Event) {
    event.preventDefault();
    this.hostEl.scrollTo({ left: this.hostEl.scrollWidth, behavior: 'smooth' });
  }
}
