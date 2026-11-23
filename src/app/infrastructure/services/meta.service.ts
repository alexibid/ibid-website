import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';
import { Router, NavigationEnd, ActivatedRoute, Data } from '@angular/router';
import { filter, map, switchMap } from 'rxjs/operators';
import { I18nService } from './i18n.service';
import { RoutingService } from './routing.service';
import { extractLanguageFromPath } from '../../domain/constants/languages';

function stringField(data: Data, key: string): string {
  const value = data[key];
  return typeof value === 'string' ? value : '';
}

@Injectable({
  providedIn: 'root'
})
export class MetaService {
  private readonly titleService = inject(Title);
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly i18n = inject(I18nService);
  private readonly cmsRouter = inject(RoutingService);

  public init(): void {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        map(() => this.activatedRoute),
        map((route) => {
          let current = route;
          while (current.firstChild) {
            current = current.firstChild;
          }
          return current;
        }),
        filter((route) => route.outlet === 'primary'),
        switchMap((route) => route.data)
      )
      .subscribe((data) => {
        const lang = stringField(data, 'lang');
        if (lang) {
          this.i18n.setLanguage(lang);
        } else {
          const urlLang = extractLanguageFromPath(this.router.url);
          if (urlLang) {
            this.i18n.setLanguage(urlLang);
          }
        }
        const currentLang = this.i18n.currentLangCode();
        this.document.documentElement.lang = currentLang;
        const title = stringField(data, 'title');
        const pageTitle = title ? `${title} | IBID` : 'IBID Architecture';
        this.titleService.setTitle(pageTitle);
        this.cleanupSeoTags();
        this.generateMetaTags(stringField(data, 'location'));
      });
  }

  private cleanupSeoTags(): void {
    const head = this.document.head;
    const links = head.querySelectorAll('link[rel="canonical"], link[rel="alternate"]');
    links.forEach((link) => head.removeChild(link));
  }

  private generateMetaTags(location: string): void {
    const baseOrigin = 'https://ibid.pt';
    const currentPath = this.router.url.split('?')[0];
    this.createLinkElement('canonical', `${baseOrigin}${currentPath}`);
    if (!location) {
      return;
    }
    const translations = this.cmsRouter.translationMap.get(location);
    if (translations && translations.length > 0) {
      translations.forEach((trans) => {
        this.createLinkElement('alternate', `${baseOrigin}${trans.url}`, trans.lang);
      });
      const defaultTranslation = translations.find((t) => t.lang === 'pt') || translations[0];
      this.createLinkElement('alternate', `${baseOrigin}${defaultTranslation.url}`, 'x-default');
    }
  }

  private createLinkElement(rel: string, href: string, hreflang?: string): void {
    const link = this.document.createElement('link');
    link.setAttribute('rel', rel);
    link.setAttribute('href', href);
    if (hreflang) {
      link.setAttribute('hreflang', hreflang);
    }
    this.document.head.appendChild(link);
  }
}
