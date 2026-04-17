import { Component, OnDestroy, signal, effect } from '@angular/core';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { BasePage } from '../../core/base/base-page';

@Component({
  selector: 'app-chapter',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './chapter.html',
  styleUrl: './chapter.scss',
})
export class Chapter extends BasePage implements OnDestroy {
  protected readonly needsBlankPage = signal<boolean>(false);

  constructor() {
    super();
    effect(() => {
      if (this.pageData() && this.isBrowser) {
        this.needsBlankPage.set(false);
        setTimeout(() => {
          this.scrollToStart();
          this.measurePage();
        }, 100);
      }
    });
  }

  protected override onPageMeasured(totalCols: number) {
    const isDesktop = window.innerWidth >= 768;
    if (isDesktop && totalCols % 2 !== 0 && !this.needsBlankPage()) {
      this.needsBlankPage.set(true);
      setTimeout(() => this.measurePage(), 50);
      return;
    }
    super.onPageMeasured(totalCols);
  }
}
