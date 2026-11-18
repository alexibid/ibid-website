import {Component, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { UiErrorService } from '../../../../infrastructure/services/ui-error.service';
import { I18nService } from '../../../../infrastructure/services/i18n.service';

interface AlertText {
  readonly title: string;
  readonly message: string;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null;
}

function isAlertText(value: unknown): value is AlertText {
  return isRecord(value) && typeof value['title'] === 'string' && typeof value['message'] === 'string';
}

function textOf(translations: unknown, key: string): AlertText | undefined {
  const entry = isRecord(translations) ? translations[key] : undefined;
  return isAlertText(entry) ? entry : undefined;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'website-global-alert',
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
    
    const translations = this.i18nService.ui();
    const message = textOf(translations, errType) ?? textOf(translations, 'error-generic');
    if (!message) return null;

    const close = isRecord(translations) && typeof translations['close'] === 'string' ? translations['close'] : '';
    return { ...message, close };
  });

  protected closeAlert(): void {
    this.uiService.clearError();
  }
}
