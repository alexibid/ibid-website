import {
  ApplicationConfig,
  EnvironmentProviders,
  ErrorHandler,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { environment } from '../environments/environment';
import { routes } from './app.routes';
import { RoutingService } from './infrastructure/services/routing.service';
import { MetaService } from './infrastructure/services/meta.service';
import { GlobalErrorHandler } from './infrastructure/handlers/global-error.handler';
import { errorInterceptor } from './infrastructure/interceptors/error.interceptor';
import {
  ADMIN_CONTENT_REPOSITORY,
  CONTENT_READ_REPOSITORY
} from './infrastructure/tokens/content-repository.token';
import {
  ANTI_SPAM_PRODUCTION,
  ANTI_SPAM_TOKEN_PORT,
  RECAPTCHA_SITE_KEY,
  createLazyRecaptchaAntiSpamPort
} from './infrastructure/tokens/contact.tokens';
import { StaticHtmlContentRepository } from './infrastructure/repositories/static-html-content.repository';
import { ApiContentRepository } from './infrastructure/repositories/api-content.repository';

export type ContentMode = 'static' | 'api';

export function provideContentRepositories(mode: ContentMode): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: CONTENT_READ_REPOSITORY,
      useClass: mode === 'static' ? StaticHtmlContentRepository : ApiContentRepository
    },
    {
      provide: ADMIN_CONTENT_REPOSITORY,
      useClass: ApiContentRepository
    }
  ]);
}

export function provideContactAntiSpam(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: RECAPTCHA_SITE_KEY, useFactory: () => environment.recaptchaSiteKey },
    { provide: ANTI_SPAM_PRODUCTION, useFactory: () => environment.production },
    { provide: ANTI_SPAM_TOKEN_PORT, useFactory: createLazyRecaptchaAntiSpamPort }
  ]);
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideBrowserGlobalErrorListeners(),
    provideContentRepositories(environment.contentMode),
    provideContactAntiSpam(),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    provideHttpClient(
      withFetch(),
      withInterceptors([errorInterceptor])
    ),
    provideRouter(routes, withComponentInputBinding()),
    provideClientHydration(withEventReplay()),
    provideAppInitializer(() => {
      const routingService = inject(RoutingService);
      const metaService = inject(MetaService);
      metaService.init();
      return routingService.loadRoutes();
    })
  ]
};
