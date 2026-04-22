import { Component, inject, HostBinding, signal, effect, computed, PLATFORM_ID, HostListener } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { BookService } from '../../../../core/services/book.service';
import { PageType } from '../../../../shared/types/page-type.enum';
import { GlobalStateService } from '../../../../core/services/global-state.service';

@Component({
  selector: 'app-page-turn',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './page-turn.html',
  styleUrl: './page-turn.scss'
})
export class PageTurn {
  public bookService = inject(BookService);
  private stateService = inject(GlobalStateService);
  private platformId = inject(PLATFORM_ID);
  public isBrowser = isPlatformBrowser(this.platformId);
  
  public flippedNext = signal(false);
  public flippedPrev = signal(false);
  public isDesktop = signal<boolean>(true);

  // Marcar o estado da página actual
  public state = computed(() => this.stateService.currentState());

  // Numeração no Display (Visual)
  public leftPageNum = computed(() => {
    const s = this.state();
    if (s.type !== PageType.Chapter) return 0;
    return this.isDesktop() ? s.leftPage : s.page;
  });

  public rightPageNum = computed(() => {
    const s = this.state();
    if (s.type !== PageType.Chapter) return 0;
    return this.isDesktop() ? s.rightPage : s.page;
  });

  constructor() {
    if (this.isBrowser) {
      this.isDesktop.set(window.innerWidth >= 768);
    }

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

  @HostListener('window:resize')
  onResize() {
    if (this.isBrowser) {
      this.isDesktop.set(window.innerWidth >= 768);
    }
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
