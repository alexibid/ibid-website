import { Component, OnDestroy, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageType } from '../../shared/types/page-type.enum';
import { BasePage } from '../../core/base/base-page';
import { NavigationService } from '../../core/services/navigation.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class Home extends BasePage implements OnDestroy {
  private navService = inject(NavigationService);
  protected readonly needsBlankPage = signal<boolean>(false);

  public previousUrl() {
    this.navService.back();
  }

  constructor() {
    super();

    effect(() => {
      const lang = this.i18n.currentLangCode();
      this.loadAllSections(PageType.Home, lang);
    });

    effect(() => {
      const sections = this.sections();
      const frontCover = sections.find(s => {
        return s.metadata?.location === 'front-cover';
      });
      if (frontCover) {
        this.stateService.coverData.set(frontCover);
      }

      if (sections.length > 0 && this.isBrowser) {
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
