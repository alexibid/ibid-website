import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { I18nService, SUPPORTED_LANGUAGES } from '../../../../infrastructure/services/i18n.service';
import { RoutingService } from '../../../../infrastructure/services/routing.service';
import { normalizeLanguageCode } from '../../../../domain/constants/languages';
import { ClickOutsideDirective } from '../../../directives/click-outside.directive';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'website-lang-selector',
  standalone: true,
  imports: [UpperCasePipe, ClickOutsideDirective],
  templateUrl: './lang-selector.html',
  styleUrl: './lang-selector.scss'
})
export class LangSelector {
  public readonly i18n = inject(I18nService);
  public readonly languages = inject(SUPPORTED_LANGUAGES);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly routingService = inject(RoutingService);

  public readonly isLangMenuOpen = signal<boolean>(false);

  public toggleLangMenu(): void {
    this.isLangMenuOpen.update((open) => !open);
  }

  public closeMenu(): void {
    this.isLangMenuOpen.set(false);
  }

  public changeLanguage(targetLang: string): void {
    const normalized = normalizeLanguageCode(targetLang);
    if (!this.languages.includes(normalized)) {
      this.isLangMenuOpen.set(false);
      return;
    }

    this.i18n.setLanguage(normalized);

    let currentRoute = this.activatedRoute;
    while (currentRoute.firstChild) {
      currentRoute = currentRoute.firstChild;
    }

    const location = currentRoute.snapshot.data['location'];
    const currentLocation = typeof location === 'string' ? location : '';

    if (currentLocation) {
      const translations = this.routingService.translationMap.get(currentLocation);
      const matchedTranslation = translations?.find((t) => t.lang === normalized);
      if (matchedTranslation) {
        this.router.navigate([matchedTranslation.url]);
        this.isLangMenuOpen.set(false);
        return;
      }
    }

    this.router.navigate(['/', normalized]);
    this.isLangMenuOpen.set(false);
  }
}
