import { Component, OnDestroy, effect, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Cover } from '../../shared/components/cover/cover';
import { PageType } from '../../core/models/page-type.enum';
import { BasePage } from '../../core/base/base-page';
import { NavigationService } from '../../core/services/navigation.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [Cover, RouterLink, TranslatePipe],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class Home extends BasePage implements OnDestroy {
  private navService = inject(NavigationService);

  public previousUrl() {
    this.navService.back();
  }

  constructor() {
    super();
    effect(() => this.loadAllSections(PageType.Home, this.i18n.currentLangCode()));
  }
}
