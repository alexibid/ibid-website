import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection, provideAppInitializer, inject, ErrorHandler } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { RoutingService } from './core/services/routing.service';
import { GlobalErrorHandler } from './core/handlers/global-error.handler';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { provideQuillConfig } from 'ngx-quill';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideBrowserGlobalErrorListeners(),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    provideHttpClient(
      withInterceptors([errorInterceptor])
    ),
    provideQuillConfig({
      modules: {
        toolbar: [
          ['bold', 'italic', 'underline', 'strike'],
          ['blockquote', 'code-block'],
          [{ 'header': 1 }, { 'header': 2 }],
          ['link', 'image']
        ]
      },
      placeholder: 'Escreva algo aqui...'
    }),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideAppInitializer(() => {
      const routingService = inject(RoutingService);
      return routingService.setupRoutes();
    })
  ]
};
