import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UiErrorService } from './core/services/ui-error.service';
import { I18nService } from './core/services/i18n.service';
import { GlobalAlertComponent } from './shared/components/global-alert/global-alert';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, GlobalAlertComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected errorService = inject(UiErrorService);
  protected i18n = inject(I18nService);
}
