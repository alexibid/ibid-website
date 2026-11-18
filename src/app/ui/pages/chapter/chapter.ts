import { Component, OnDestroy, OnInit, signal, computed, effect, inject, input, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { BookNavigationDirective } from '../../directives/book-navigation.directive';
import { BookService } from '../../../infrastructure/services/book.service';
import { StateService } from '../../../application/state/state.service';
import { CmsRouteData } from '../../../domain/models/cms.interface';
import { PageType } from '../../../domain/models/page-type.enum';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'website-chapter',
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
  public readonly lang = input<string>();
  public readonly location = input<string>();
  public readonly title = input<string>();
  public readonly content = input<string>();
  public readonly pageId = input<string>();
  public readonly metadata = input<Record<string, unknown>>();
  public readonly type = input<string>();

  private readonly nav = inject(BookNavigationDirective);
  private readonly bookService = inject(BookService);
  private readonly route = inject(ActivatedRoute);
  public readonly stateService = inject(StateService);

  private readonly routePageData = signal<CmsRouteData | null>(null);
  public readonly pageData = computed<CmsRouteData | null>(() => {
    if (this.title() || this.content()) {
      return {
        pageId: this.pageId() ?? '',
        title: this.title() ?? '',
        lang: this.lang() ?? '',
        type: (this.type() as PageType) ?? PageType.Chapter,
        content: this.content() ?? '',
        metadata: (this.metadata() as Record<string, unknown>) ?? { location: this.location() },
        location: this.location()
      };
    }
    return this.routePageData();
  });

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
      this.routePageData.set(data as CmsRouteData);
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
