import { Component, inject, HostBinding, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BookService } from '../../../core/services/book.service';

@Component({
  selector: 'app-page-turn',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './page-turn.html',
  styleUrl: './page-turn.scss'
})
export class PageTurn {
  public bookService = inject(BookService);
  
  public flippedNext = signal(false);
  public flippedPrev = signal(false);

  constructor() {
    effect(() => {
      const isFlipping = this.bookService.isFlipping();
      const dir = this.bookService.flipDirection();
      
      if (isFlipping) {
        // Wait 1 frame so the host 'is-active' mounts and opacity applies
        // before we apply the rotateY transition, forcing it to animate!
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
}
