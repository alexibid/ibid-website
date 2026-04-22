import { Injectable, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter, map, mergeMap } from 'rxjs/operators';
import { I18nService } from './i18n.service';
import { CmsRouterService } from './cms-router.service';
import { CmsRouteData } from '../../shared/types/cms.interface';

@Injectable({
  providedIn: 'root'
})
export class MetaService {
  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta); // Injeção nativa do Angular
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly i18n = inject(I18nService);
  private readonly cmsRouter = inject(CmsRouterService);

  public init(): void {
    // Escuta todas as mudanças finais de navegação do Router
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
        
        // 1. Soberania do URL: Se a página tiver língua explícita, força o I18nService a obedecer-lhe!
        if (routeData && routeData.lang) {
          this.i18n.setLanguage(routeData.lang);
        }

        // 2. Atualizar atributo HTML nativo
        const currentLang = this.i18n.currentLangCode();
        this.document.documentElement.lang = currentLang;

        // 3. Atualizar Title dinamicamente
        const pageTitle = routeData?.title ? `${routeData.title} | IBID` : 'IBID Architecture';
        this.titleService.setTitle(pageTitle);

        // 4. Limpar metadatas Canonical e Hreflang antigas da rota anterior
        this.cleanupSeoTags();

        // 5. Otimizar URLs (Canonical e Hreflangs) baseados no Mapa de Traduções do Router
        this.generateCanonicalAndHreflangTags(routeData);
      });
  }

  private cleanupSeoTags() {
    // Removemos canonicals e alternates anteriores para não poluir o Header com duplicados
    const head = this.document.head;
    const links = head.querySelectorAll('link[rel="canonical"], link[rel="alternate"]');
    links.forEach(link => head.removeChild(link));
  }

  private generateCanonicalAndHreflangTags(routeData: CmsRouteData) {
    if (!routeData) return;

    // A origin do nosso website (alterar em produção se for para dominio fixo ou usar location.origin no browser)
    // No SSR, o location pode não existir perfeitamente, garantimos uma base sólida:
    const baseOrigin = 'https://ibid.pt'; // Substituir pelo dominio final real do cliente

    // Criar tag Canónica do URL Atual (fundamental para o Bot do Google não penalizar)
    const currentPath = this.router.url.split('?')[0]; 
    this.createLinkElement('canonical', `${baseOrigin}${currentPath}`);

    // Se tivermos location e houver irmãos, gerar hreflangs
    if (routeData.location) {
      const translations = this.cmsRouter.translationMap.get(routeData.location);
      if (translations && translations.length > 0) {
        
        // Adicionar uma tag por cada tradução associada (incluindo a própria língua como é exigido nas specs de SEO)
        translations.forEach(trans => {
          this.createLinkElement('alternate', `${baseOrigin}${trans.url}`, trans.lang);
        });
        
        // Hreflang x-default aponta convencionalmente para o Inglês ou PT (vamos reencaminhar para a lingua selecionada default de fallback)
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
