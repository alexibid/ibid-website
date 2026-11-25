import {
  ChangeDetectionStrategy, Component, OnDestroy, computed, inject, input
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from '../../../../application/state/state.service';
import { CoverMotionState } from '../../../../application/state/cover-motion.state';
import { BookService } from '../../../../infrastructure/services/book.service';
import { PageTurn } from '../page-turn/page-turn';

export {
  syncAllChapterPageCounts,
  recordMeasuredChapterPage,
  type BookPaginationDeps,
  type ChapterEstimator
} from '../../../../application/state/state.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'website-footer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './footer.html',
  styleUrl: './footer.scss'
})
export class Footer implements OnDestroy {
  public readonly globalState = inject(StateService);
  public readonly bookService = inject(BookService);
  private readonly coverMotion = inject(CoverMotionState);
  public readonly pageTurn = input.required<PageTurn>();

  public readonly canGoPrev = computed(() => {
    const page = this.bookService.currentChapterPage();
    const isDesktopHomeOpen = this.globalState.isDesktopCoverStage() && this.coverMotion.isOpen();
    return page > 1 || isDesktopHomeOpen || !!this.globalState.prevLink();
  });

  public readonly canGoNext = computed(() => {
    this.bookService.pageCountsUpdated();
    const page = this.bookService.currentChapterPage();
    const total = this.bookService.getChapterPages(this.bookService.activeChapterSlug());
    const isDesktop = this.globalState.isDesktop();
    const isDesktopHomeClosed = this.globalState.isDesktopCoverStage() && !this.coverMotion.isOpen();
    const hasMorePages = isDesktop ? page + 1 < total : page < total;
    return hasMorePages || isDesktopHomeClosed || !!this.globalState.nextLink();
  });

  ngOnDestroy(): void {
    this.globalState.cancelScheduledNavigation();
  }

  public navigatePage(direction: number): void {
    if (this.globalState.isTransitioning()) return;
    if (direction === -1 && !this.canGoPrev()) return;
    if (direction === 1 && !this.canGoNext()) return;
    this.bookService.navigationRequest.next(direction);
  }

  public navigateChapter(link: string | null, direction: number): void {
    if (!link || this.bookService.isFlipping()) return;
    this.globalState.navigateWithFlip(link, direction);
  }
}
