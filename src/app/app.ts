import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { UiErrorService } from './core/services/ui-error.service';
import { I18nService } from './core/services/i18n.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <!-- Navegação e Conteúdo Principal -->
    <router-outlet></router-outlet>

    <!-- Overlay de Erro Global -->
    <div class="error-overlay" *ngIf="errorService.currentError() as errorType">
      <div class="error-modal" *ngIf="i18n.ui()[errorType] as t">
        <h2>{{ t.title }}</h2>
        <p>{{ t.message }}</p>
        <button (click)="errorService.clearError()">{{ i18n.ui()['close'] }}</button>
      </div>
    </div>
  `,
  styles: [`
    .error-overlay {
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
      z-index: 9999;
    }
    .error-modal {
      background: white; padding: 30px; border-radius: 8px; max-width: 400px; text-align: center;
      box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    }
    button { margin-top: 20px; padding: 10px 20px; cursor: pointer; }
  `]
})
export class App {
  protected errorService = inject(UiErrorService);
  protected i18n = inject(I18nService);
}
