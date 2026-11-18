import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from '../../components/layout/header/header';
import { Footer } from '../../components/layout/footer/footer';
import { PageTurn } from '../../components/layout/page-turn/page-turn';
import { GlobalAlertComponent } from '../../components/ui/global-alert/global-alert';
import { StateService } from '../../../application/state/state.service';
import { CommonModule } from '@angular/common';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'website-frontoffice-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, Header, Footer, PageTurn, GlobalAlertComponent],
  templateUrl: './frontoffice-layout.html',
  styleUrl: './frontoffice-layout.scss',
  host: {
    '[class.is-cover]': 'globalState.isOnCover()'
  }
})
export class FrontofficeLayout {
  public globalState = inject(StateService);
}
