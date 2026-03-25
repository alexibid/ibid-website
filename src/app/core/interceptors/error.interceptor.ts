import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { UiErrorService } from '../services/ui-error.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const uiError = inject(UiErrorService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Mapeamos status codes para os nossos tipos de erro i18n
      if (error.status === 0) {
        uiError.showError('error-network');
      } else if (error.status >= 500) {
        uiError.showError('error-server');
      } else if (error.status === 404) {
        // O 404 de conteúdo é tratado pelo Dispatcher, mas aqui apanhamos falhas de API
        uiError.showError('not-found');
      } else {
        uiError.showError('error-generic');
      }
      
      return throwError(() => error);
    })
  );
};
