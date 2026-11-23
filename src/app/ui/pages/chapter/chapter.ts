import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  input,
  signal
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { BookFacade } from '../../../application/facades/book.facade';
import { StateService } from '../../../application/state/state.service';
import type { CmsPageMetadata, CmsRouteData } from '../../../domain/models/cms.interface';
import { PageType } from '../../../domain/models/page-type.enum';
import { isRecord, toPageType } from '../../../domain/models/static-routes.model';
import { BookService } from '../../../infrastructure/services/book.service';
import { BookNavigationDirective } from '../../directives/book-navigation.directive';
import { TranslatePipe } from '../../pipes/translate.pipe';

function toRouteData(value: unknown): CmsRouteData | null {
  if (!isRecord(value)) {
    return null;
  }
  const pageId = typeof value['pageId'] === 'string' ? value['pageId'] : '';
  const title = typeof value['title'] === 'string' ? value['title'] : '';
  const content = typeof value['content'] === 'string' ? value['content'] : '';
  if (!pageId && !title && !content) {
    return null;
  }
  const lang = typeof value['lang'] === 'string' ? value['lang'] : '';
  const location = typeof value['location'] === 'string' ? value['location'] : undefined;
  const metadata = isRecord(value['metadata']) ? value['metadata'] : undefined;
  return {
    pageId,
    title,
    lang,
    type: toPageType(value['type'], PageType.Chapter),
    content,
    ...(metadata !== undefined ? { metadata } : {}),
    ...(location !== undefined ? { location } : {})
  };
}

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
  public readonly metadata = input<CmsPageMetadata>();
  public readonly type = input<string>();

  private readonly nav = inject(BookNavigationDirective);
  private readonly bookService = inject(BookService);
  private readonly bookFacade = inject(BookFacade);
  private readonly route = inject(ActivatedRoute);
  public readonly stateService = inject(StateService);

  private readonly routePageData = signal<CmsRouteData | null>(null);
  private readonly basePageData = computed<CmsRouteData | null>(() => {
    if (this.pageId() || this.title() || this.content()) {
      return {
        pageId: this.pageId() ?? '',
        title: this.title() ?? '',
        lang: this.lang() ?? '',
        type: toPageType(this.type(), PageType.Chapter),
        content: this.content() ?? '',
        metadata: this.metadata() ?? { location: this.location() },
        location: this.location()
      };
    }
    return this.routePageData();
  });

  public readonly pageData = computed<CmsRouteData | null>(() => {
    const base = this.basePageData();
    if (!base) {
      return null;
    }
    if (base.content) {
      return base;
    }
    const loaded = this.bookFacade.currentChapter();
    if (loaded && loaded.id === base.pageId) {
      return {
        pageId: loaded.id,
        title: loaded.title || base.title,
        lang: loaded.lang || base.lang,
        type: loaded.type,
        content: loaded.content,
        metadata: loaded.metadata ?? base.metadata,
        location: loaded.metadata?.location ?? base.location
      };
    }
    return base;
  });

  protected readonly needsBlankPage = signal<boolean>(false);
  private readonly destroy$ = new Subject<void>();
  private remeasureTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    effect(() => {
      const base = this.basePageData();
      if (base && !base.content && base.pageId) {
        void this.bookFacade.loadChapter(base.pageId);
      }
    });

    effect((onCleanup) => {
      const data = this.pageData();
      if (data && data.content && this.stateService.isBrowser) {
        this.needsBlankPage.set(false);
        const timerId = setTimeout(() => {
          this.nav.scrollToStart();
          this.nav.measurePage();
        }, 100);
        onCleanup(() => clearTimeout(timerId));
      }
    });
  }

  ngOnInit(): void {
    this.route.data.pipe(takeUntil(this.destroy$)).subscribe((data) => {
      this.routePageData.set(toRouteData(data));
    });
  }

  ngOnDestroy(): void {
    if (this.remeasureTimer !== undefined) {
      clearTimeout(this.remeasureTimer);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected onPageMeasured(totalCols: number): void {
    const isDesktop = window.innerWidth >= 768;
    if (isDesktop && totalCols % 2 !== 0 && !this.needsBlankPage()) {
      this.needsBlankPage.set(true);
      this.remeasureTimer = setTimeout(() => this.nav.measurePage(), 50);
      return;
    }
    this.bookService.setPageCount(this.nav.currentSlug, totalCols);
  }
}
