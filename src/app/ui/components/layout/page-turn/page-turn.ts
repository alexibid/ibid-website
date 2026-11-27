import {Component, inject, HostBinding, signal, effect, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BookService } from '../../../../infrastructure/services/book.service';
import { PageType } from '../../../../domain/models/page-type.enum';
import { StateService } from '../../../../application/state/state.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'website-page-turn',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './page-turn.html',
  host: {
    class: 'page-turn'
  }
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

  @HostBinding('class.page-turn--to-cover') get isToCover() {
    return this.stateService.approachingCover();
  }

  @HostBinding('class.page-turn--from-cover') get isFromCover() {
    return this.stateService.isOnCover();
  }
}
