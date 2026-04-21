import { Component, OnDestroy, effect, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { Cover } from '../../shared/components/cover/cover';
import { PageType } from '../../core/models/page-type.enum';
import { BasePage } from '../../core/base/base-page';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [Cover, RouterLink, TranslatePipe],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class Home extends BasePage implements OnDestroy {

  private readonly location = inject(Location);
  protected readonly previousUrl = signal<string | null>(null);

  constructor() {
    super();
    
    const state = this.location.getState() as { navigationId: number };
    if (state && state.navigationId > 1) {
      console.log('document.referrer', document.referrer);
      this.previousUrl.set(document.referrer.includes(window.location.host) ? document.referrer : null);
    }

    effect(() => this.loadAllSections(PageType.Home, this.i18n.currentLangCode()));
  }
}
