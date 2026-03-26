import { ErrorHandler, Injectable, inject } from '@angular/core';
import { UiErrorService } from '../services/ui-error.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly uiErrorService = inject(UiErrorService);

  handleError(error: any): void {
    const message = error.message ? error.message : error.toString();
    console.error('Um erro fatal evadido pelo Global Guard:', message);
    this.uiErrorService.showError('error-generic');
  }
}
