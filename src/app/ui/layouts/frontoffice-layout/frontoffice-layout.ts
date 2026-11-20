import { Component, inject, ChangeDetectionStrategy, computed } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from '../../components/layout/header/header';
import { Footer } from '../../components/layout/footer/footer';
import { PageTurn } from '../../components/layout/page-turn/page-turn';
import { CoverMotion } from '../../components/layout/cover-motion/cover-motion';
import { GlobalAlertComponent } from '../../components/ui/global-alert/global-alert';
import { StateService } from '../../../application/state/state.service';
import { CoverMotionState } from '../../../application/state/cover-motion.state';
import { BookService } from '../../../infrastructure/services/book.service';
import { PageType } from '../../../domain/models/page-type.enum';
import { CommonModule } from '@angular/common';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'website-frontoffice-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, Header, Footer, PageTurn, CoverMotion, GlobalAlertComponent],
  templateUrl: './frontoffice-layout.html',
  styleUrl: './frontoffice-layout.scss',
  host: {
    '[class.is-cover]': 'globalState.isOnCover()',
    '[class.is-cover-closed]': 'isCoverClosed()'
  }
})
export class FrontofficeLayout {
  public globalState = inject(StateService);
  private readonly coverMotion = inject(CoverMotionState);
  private readonly bookService = inject(BookService);

  protected readonly isCoverClosed = computed(
    () => this.bookService.activePageType() === PageType.Home && !this.coverMotion.isOpen()
  );
}
