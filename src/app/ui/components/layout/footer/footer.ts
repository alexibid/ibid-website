import {Component, inject, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { StateService } from '../../../../application/state/state.service';
import { BookService } from '../../../../infrastructure/services/book.service';
import { PageTurn } from '../page-turn/page-turn';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'website-footer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './footer.html',
  styleUrl: './footer.scss'
})
export class Footer {
  public globalState = inject(StateService);
  public bookService = inject(BookService);
  private router = inject(Router);
  public pageTurn = input.required<PageTurn>();

  public canGoPrev = computed(() => {
    const page = this.bookService.currentChapterPage();
    return page > 1 || !!this.globalState.prevLink();
  });

  public canGoNext = computed(() => {
    const page = this.bookService.currentChapterPage();
    const slug = this.bookService.activeChapterSlug();
    const total = this.bookService.getChapterPages(slug);
    return page < total || !!this.globalState.nextLink();
  });

  public navigatePage(dir: number) {
    if (dir === -1 && !this.canGoPrev()) return;
    if (dir === 1 && !this.canGoNext()) return;
    this.bookService.navigationRequest.next(dir);
  }

  public navigateChapter(link: string | null, dir: number) {
    if (!link) return;
    this.bookService.triggerFlip(dir);
    setTimeout(() => {
      this.router.navigate([link]);
    }, 450);
  }
}
