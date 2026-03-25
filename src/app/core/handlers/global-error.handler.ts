import { ErrorHandler, Injectable } from '@angular/core';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  handleError(error: any): void {
    // Aqui capturamos todos os erros da aplicação (incluindo os passados pelo interceptor)
    const message = error.message ? error.message : error.toString();
    
    console.error('Global Error Caught:', message);

    // No futuro, este é o local para enviar o erro para o backend de monitorização
    // ex: this.loggingService.log(error);
  }
}
