import { Component, OnDestroy, OnInit, signal, effect, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { BookNavigationDirective } from '../../shared/directives/book-navigation.directive';
import { BookService } from '../../core/services/book.service';
import { StateService } from '../../core/services/state.service';
import { CmsRouteData } from '../../shared/types/cms.interface';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-chapter',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './chapter.html',
  styleUrl: './chapter.scss',
  hostDirectives: [{
    directive: BookNavigationDirective,
    outputs: ['pageMeasured']
  }],
  host: {
    '(pageMeasured)': 'onPageMeasured($event)'
  }
})
export class Chapter implements OnInit, OnDestroy {
  private readonly nav = inject(BookNavigationDirective);
  private readonly bookService = inject(BookService);
  private readonly route = inject(ActivatedRoute);
  public readonly stateService = inject(StateService);

  public readonly pageData = signal<CmsRouteData | null>(null);
  protected readonly needsBlankPage = signal<boolean>(false);
  private readonly destroy$ = new Subject<void>();

  constructor() {
    effect(() => {
      if (this.pageData() && this.stateService.isBrowser) {
        this.needsBlankPage.set(false);
        setTimeout(() => {
          this.nav.scrollToStart();
          this.nav.measurePage();
        }, 100);
      }
    });
  }

  ngOnInit() {
    this.route.data.pipe(takeUntil(this.destroy$)).subscribe(data => {
      this.pageData.set(data as CmsRouteData);
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected onPageMeasured(totalCols: number) {
    const isDesktop = window.innerWidth >= 768;
    if (isDesktop && totalCols % 2 !== 0 && !this.needsBlankPage()) {
      this.needsBlankPage.set(true);
      setTimeout(() => this.nav.measurePage(), 50);
      return;
    }
    this.bookService.setPageCount(this.nav.currentSlug, totalCols);
  }
}
