import { Injectable, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter, map, mergeMap } from 'rxjs/operators';
import { I18nService } from './i18n.service';
import { RoutingService } from './routing.service';
import { CmsRouteData } from '../../shared/types/cms.interface';

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
        filter(event => event instanceof NavigationEnd),
        map(() => this.activatedRoute),
        map(route => {
          while (route.firstChild) route = route.firstChild;
          return route;
        }),
        filter(route => route.outlet === 'primary'),
        mergeMap(route => route.data)
      )
      .subscribe((data) => {
        const routeData = data as CmsRouteData;
        if (routeData && routeData.lang) {
          this.i18n.setLanguage(routeData.lang);
        }
        const currentLang = this.i18n.currentLangCode();
        this.document.documentElement.lang = currentLang;
        const pageTitle = routeData?.title ? `${routeData.title} | IBID` : 'IBID Architecture';
        this.titleService.setTitle(pageTitle);
        this.cleanupSeoTags();
        this.generateMetaTags(routeData);
      });
  }

  private cleanupSeoTags() {
    const head = this.document.head;
    const links = head.querySelectorAll('link[rel="canonical"], link[rel="alternate"]');
    links.forEach(link => head.removeChild(link));
  }

  private generateMetaTags(routeData: CmsRouteData) {
    if (!routeData) return;
    const baseOrigin = 'https://ibid.pt';
    const currentPath = this.router.url.split('?')[0];
    this.createLinkElement('canonical', `${baseOrigin}${currentPath}`);
    if (routeData.location) {
      const translations = this.cmsRouter.translationMap.get(routeData.location);
      if (translations && translations.length > 0) {
        translations.forEach(trans => {
          this.createLinkElement('alternate', `${baseOrigin}${trans.url}`, trans.lang);
        });
        const defaultTranslation = translations.find(t => t.lang === 'pt') || translations[0];
        this.createLinkElement('alternate', `${baseOrigin}${defaultTranslation.url}`, 'x-default');
      }
    }
  }

  private createLinkElement(rel: string, href: string, hreflang?: string) {
    const link = this.document.createElement('link');
    link.setAttribute('rel', rel);
    link.setAttribute('href', href);
    if (hreflang) {
      link.setAttribute('hreflang', hreflang);
    }
    this.document.head.appendChild(link);
  }
}
