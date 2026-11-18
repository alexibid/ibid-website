import { ErrorHandler, Injectable, inject } from '@angular/core';
import { UiErrorService } from '../services/ui-error.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly uiErrorService = inject(UiErrorService);

  handleError(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Fatal error caught by Global Error Handler:', message);
    this.uiErrorService.showError('error-generic');
  }
}
