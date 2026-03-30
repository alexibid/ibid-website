import { Component, inject, computed, signal, HostListener, PLATFORM_ID, OnInit } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterOutlet, Router, ActivatedRoute, NavigationEnd, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { UiErrorService } from './core/services/ui-error.service';
import { I18nService } from './core/services/i18n.service';
import { GlobalAlertComponent } from './shared/components/global-alert/global-alert';
import { MetaService } from './core/services/meta.service';
import { CmsRouterService } from './core/services/cms-router.service';
import { CmsRouteData } from './core/models/cms.interface';
import { PageType } from './core/models/page-type.enum';
import { BookService } from './core/services/book.service';
import { PageTurn } from './shared/components/page-turn/page-turn';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, GlobalAlertComponent, PageTurn],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected errorService = inject(UiErrorService);
  public i18n = inject(I18nService);
  private appMetaService = inject(MetaService);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private cmsRouter = inject(CmsRouterService);
  private bookService = inject(BookService);
  private platformId = inject(PLATFORM_ID);
  public isBrowser = isPlatformBrowser(this.platformId);

  public prevLink = signal<string | null>(null);
  public nextLink = signal<string | null>(null);

  public isDesktop = signal<boolean>(true);
  public isAdmin = signal<boolean>(false);

  public isCoverPage = computed(() => {
    const type = this.bookService.activePageType();
    const slug = this.bookService.activeChapterSlug() || '';
    
    if (type === PageType.Home) {
      return this.bookService.currentPageInChapter() === 1;
    } else if (type === PageType.Exit) {
      const total = this.bookService.getChapterPageCount(slug);
      return this.bookService.currentPageInChapter() === total;
    }
    return false;
  });

  public globalPageNumber = computed(() => {
    const slug = this.bookService.activeChapterSlug();
    const start = this.bookService.getStartingPage(slug) || 1;
    const current = this.bookService.currentPageInChapter() || 1;
    return start + current - 1;
  });

  public leftPageNum = computed(() => {
    const num = this.globalPageNumber();
    return this.isDesktop() ? num * 2 - 1 : num;
  });

  public rightPageNum = computed(() => {
    const num = this.globalPageNumber();
    return this.isDesktop() ? num * 2 : num; // Output ignored on mobile
  });

  constructor() {
    this.appMetaService.init();

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      let url = event.urlAfterRedirects.split('?')[0].split('#')[0];
      const slug = (url === '/' || url === '') ? '' : url.substring(1);
      
      this.isAdmin.set(url.startsWith('/admin'));
      this.bookService.activeChapterSlug.set(slug);

      // Extract route data to set activePageType
      let route = this.activatedRoute;
      while (route.firstChild) route = route.firstChild;
      const routeData = route.snapshot.data as CmsRouteData;
      if (routeData && routeData.type) {
        this.bookService.activePageType.set(routeData.type);
      }

      const routes = this.bookService.dynamicRouteOrder();
      let index = routes.indexOf(slug);
      
      if (index === -1) {
        // Fallback for homepage variations
        const langRoute = this.i18n.currentLangCode() === 'pt' ? '' : this.i18n.currentLangCode();
        index = routes.indexOf(langRoute);
      }

      if (index === -1) {
        this.prevLink.set(null);
        this.nextLink.set(null);
        return;
      }
      
      this.prevLink.set(index > 0 ? '/' + routes[index - 1] : null);
      this.nextLink.set(index < routes.length - 1 ? '/' + routes[index + 1] : null);
    });
  }

  @HostListener('window:resize')
  onResize() {
    if (this.isBrowser) {
      this.isDesktop.set(window.innerWidth > 768);
    }
  }

  ngOnInit() {
    if (this.isBrowser) {
      this.isDesktop.set(window.innerWidth > 768);
    }
  }

  // Permite mudar de Língua com Navegação Hard URL cruzada com a DB
  changeLanguage(targetLang: string): void {
    // Definimos já na memória local o pedido para as próximas navegações orgânicas
    this.i18n.setLanguage(targetLang);

    // Navegar pela rota até à Folha Final para saber onde o utilizador "está" parado neste exato milissegundo
    let currentRoute = this.activatedRoute;
    while (currentRoute.firstChild) {
      currentRoute = currentRoute.firstChild;
    }

    const routeData = currentRoute.snapshot.data as CmsRouteData;
    const currentLocation = routeData?.location;

    // Se a página tem um "Location ID" e há traduções no Dicionário para ela:
    if (currentLocation) {
      const translations = this.cmsRouter.translationMap.get(currentLocation);
      if (translations) {
        // Encontra o URL da tradução compatível com o botão que clicaste
        const matchedTranslation = translations.find(t => t.lang === targetLang);
        if (matchedTranslation) {
          this.router.navigate([matchedTranslation.url]);
          return;
        }
      }
    }

    // Fallback
    if (targetLang === 'pt') this.router.navigate(['/']);
    else this.router.navigate(['/' + targetLang]);
  }
}
