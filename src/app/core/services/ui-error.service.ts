import { Injectable, signal } from '@angular/core';

export type ErrorType = 'not-found' | 'error-network' | 'error-server' | 'error-generic' | null;

@Injectable({
  providedIn: 'root'
})
export class UiErrorService {
  // Estado do erro atual para ser consumido pela UI global
  currentError = signal<ErrorType>(null);

  showError(type: ErrorType) {
    this.currentError.set(type);
  }

  clearError() {
    this.currentError.set(null);
  }
}
