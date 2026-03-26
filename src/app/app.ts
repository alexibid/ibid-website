import { Component, inject } from '@angular/core';
import { RouterOutlet, Router, ActivatedRoute } from '@angular/router';
import { UiErrorService } from './core/services/ui-error.service';
import { I18nService } from './core/services/i18n.service';
import { GlobalAlertComponent } from './shared/components/global-alert/global-alert';
import { MetaService } from './core/services/meta.service';
import { CmsRouterService } from './core/services/cms-router.service';
import { CmsRouteData } from './core/models/cms.interface';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, GlobalAlertComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected errorService = inject(UiErrorService);
  protected i18n = inject(I18nService);
  private appMetaService = inject(MetaService);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private cmsRouter = inject(CmsRouterService);

  constructor() {
    this.appMetaService.init();
  }

  // Permite mudar de Língua com Navegação Hard URL cruzada com a DB (Evitando o FOUC Local Variable Sync)
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

    // Fallback: Se a página em que está não tiver tradução construída na Base de Dados, enviamos o gajo para a HomePage da lingua nova!
    if (targetLang === 'pt') this.router.navigate(['/inicio']);
    else if (targetLang === 'en') this.router.navigate(['/home']);
    else this.router.navigate(['/']); 
  }
}
