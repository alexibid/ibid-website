import { Component, inject, signal } from '@angular/core';
import { CommonModule, UpperCasePipe } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { I18nService } from '../../../../core/services/i18n.service';
import { CmsRouterService } from '../../../../core/services/routing.service';
import { CmsRouteData } from '../../../../shared/types/cms.interface';
import { ClickOutsideDirective } from '../../../directives/click-outside.directive';

@Component({
  selector: 'app-lang-selector',
  standalone: true,
  imports: [CommonModule, UpperCasePipe, ClickOutsideDirective],
  templateUrl: './lang-selector.html',
  styleUrl: './lang-selector.scss'
})
export class LangSelector {
  public i18n = inject(I18nService);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private cmsRouter = inject(CmsRouterService);

  public isLangMenuOpen = signal<boolean>(false);

  public toggleLangMenu() {
    this.isLangMenuOpen.update(v => !v);
  }

  public closeMenu() {
    this.isLangMenuOpen.set(false);
  }

  changeLanguage(targetLang: string): void {
    this.i18n.setLanguage(targetLang);

    let currentRoute = this.activatedRoute;
    while (currentRoute.firstChild) {
      currentRoute = currentRoute.firstChild;
    }

    const routeData = currentRoute.snapshot.data as CmsRouteData;
    const currentLocation = routeData?.location;

    if (currentLocation) {
      const translations = this.cmsRouter.translationMap.get(currentLocation);
      if (translations) {
        const matchedTranslation = translations.find(t => t.lang === targetLang);
        if (matchedTranslation) {
          this.router.navigate([matchedTranslation.url]);
          this.isLangMenuOpen.set(false);
          return;
        }
      }
    }

    if (targetLang === 'pt') this.router.navigate(['/']);
    else this.router.navigate(['/' + targetLang]);
    
    this.isLangMenuOpen.set(false);
  }
}
