import { Component, OnDestroy, effect } from '@angular/core';
import { Cover } from '../../shared/components/cover/cover';
import { PageType } from '../../core/models/page-type.enum';
import { BasePage } from '../../core/base/base-page';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [Cover],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home extends BasePage implements OnDestroy {
  constructor() {
    super();
    effect(() => this.loadAllSections(PageType.Home, this.i18n.currentLangCode()));
  }
}
