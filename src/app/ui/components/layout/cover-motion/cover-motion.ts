import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Cover } from '../../cover/cover';
import { CoverMotionState } from '../../../../application/state/cover-motion.state';
import { StateService } from '../../../../application/state/state.service';
import { BookService } from '../../../../infrastructure/services/book.service';
import { PageType } from '../../../../domain/models/page-type.enum';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'website-cover-motion',
  standalone: true,
  imports: [Cover],
  templateUrl: './cover-motion.html',
  host: {
    class: 'cover-motion',
    'aria-hidden': 'true',
    '[class.cover-motion--home]': 'isHome()',
    '[class.cover-motion--open]': 'coverMotion.isOpen()'
  }
})
export class CoverMotion {
  protected readonly coverMotion = inject(CoverMotionState);
  protected readonly stateService = inject(StateService);
  private readonly bookService = inject(BookService);

  protected readonly isHome = computed(() => this.bookService.activePageType() === PageType.Home);

  protected settle(event: TransitionEvent): void {
    if (event.target !== event.currentTarget) return;
    if (this.coverMotion.isOpen()) return;
    this.coverMotion.land();
  }
}
