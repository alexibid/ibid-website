import { Component, inject, HostBinding, signal, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BookService } from '../../../../core/services/book.service';
import { PageType } from '../../../../shared/types/page-type.enum';
import { StateService } from '../../../../core/services/state.service';

@Component({
  selector: 'app-page-turn',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './page-turn.html',
  styleUrl: './page-turn.scss'
})
export class PageTurn {
  public bookService = inject(BookService);
  public stateService = inject(StateService);
  public flippedNext = signal(false);
  public flippedPrev = signal(false);

  public state = computed(() => this.stateService.currentState());

  public leftPageNum = computed(() => {
    const s = this.state();
    if (s.type !== PageType.Chapter) return 0;
    return this.stateService.isDesktop() ? s.leftPage : s.page;
  });

  public rightPageNum = computed(() => {
    const s = this.state();
    if (s.type !== PageType.Chapter) return 0;
    return this.stateService.isDesktop() ? s.rightPage : s.page;
  });

  constructor() {
    effect(() => {
      const isFlipping = this.bookService.isFlipping();
      const dir = this.bookService.flipDirection();

      if (isFlipping) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (dir === 1) this.flippedNext.set(true);
            if (dir === -1) this.flippedPrev.set(true);
          });
        });
      } else {
        this.flippedNext.set(false);
        this.flippedPrev.set(false);
      }
    });
  }

  @HostBinding('class.is-active') get isActive() {
    return this.bookService.isFlipping();
  }

  @HostBinding('class.page-turn--to-cover') get isToCover() {
    return this.stateService.isGoingToCover();
  }

  @HostBinding('class.page-turn--from-cover') get isFromCover() {
    return this.stateService.isOnCover();
  }
}
