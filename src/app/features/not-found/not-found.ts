import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UI_I18N } from '../../core/data/ui-i18n';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  templateUrl: './not-found.html',
  styleUrl: './not-found.scss'
})
export class NotFound {
  // Inicializamos a linguagem defeito como Português para cenários onde a rota quebrou
  protected readonly currentLang = signal<string>('pt');
  
  // Computamos automaticamente as traduções com base no ficheiro base
  protected readonly i18n = signal(UI_I18N[this.currentLang()]['not-found']);
}
