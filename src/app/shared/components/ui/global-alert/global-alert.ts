import { Component, computed, inject } from '@angular/core';
import { UiErrorService } from '../../../../core/services/ui-error.service';
import { I18nService } from '../../../../core/services/i18n.service';

@Component({
  selector: 'app-global-alert',
  imports: [],
  templateUrl: './global-alert.html',
  styleUrl: './global-alert.scss'
})
export class GlobalAlertComponent {
  private readonly uiService = inject(UiErrorService);
  private readonly i18nService = inject(I18nService);
  
  protected readonly alertData = computed(() => {
    const errType = this.uiService.currentError();
    if (!errType) return null;
    
    // O service já devolve a folha de traduções inteira para o idioma detetado via Signal.
    const uiTranslations = this.i18nService.ui();
    return uiTranslations[errType] ?? uiTranslations['error-generic'];
  });

  protected closeAlert(): void {
    this.uiService.clearError();
  }
}
