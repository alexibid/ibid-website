import {Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from '../../../shared/components/layout/header/header';
import { Footer } from '../../../shared/components/layout/footer/footer';
import { PageTurn } from '../../../shared/components/layout/page-turn/page-turn';
import { GlobalAlertComponent } from '../../../shared/components/ui/global-alert/global-alert';
import { StateService } from '../../services/state.service';
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
