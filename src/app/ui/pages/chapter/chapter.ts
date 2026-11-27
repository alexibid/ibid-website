import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, effect, inject, input, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { BookFacade } from '../../../application/facades/book.facade';
import { type BookPaginationDeps, StateService } from '../../../application/state/state.service';
import type { CmsPageMetadata, CmsRouteData } from '../../../domain/models/cms.interface';
import { PageType } from '../../../domain/models/page-type.enum';
import { isRecord, toPageType } from '../../../domain/models/static-routes.model';
import {
  BookService, type EstimateOptions, type FlowBlock, type ImageDimensions, type LayoutMetrics,
  countColumnPages, measureTextLines, readLayoutMetrics
} from '../../../infrastructure/services/book.service';
import { RoutingService } from '../../../infrastructure/services/routing.service';
import { CONTENT_READ_REPOSITORY } from '../../../infrastructure/tokens/content-repository.token';
import { BookNavigationDirective } from '../../directives/book-navigation.directive';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { prependProbeCover, splitChapterCover } from './chapter-cover';

function createImageBlocks(element: Element, metrics: LayoutMetrics, imageSizes: ReadonlyMap<string, ImageDimensions>): readonly FlowBlock[] {
  if ((element.classList.contains('img-feature--desktop') && !metrics.isDesktop) || (element.classList.contains('img-feature--mobile') && metrics.isDesktop)) return [];
  if (element.classList.contains('img-feature')) return [{ marginTop: 0, height: metrics.columnHeight, marginBottom: 0, fullColumn: true }];
  const [isLandscapeA, isLandscapeB] = [element.classList.contains('img-landscape-a'), element.classList.contains('img-landscape-b')];
  const ratio = isLandscapeA ? (metrics.isDesktop ? 0.55 : 0.5) : isLandscapeB ? (metrics.isDesktop ? 0.7 : 0.65) : 0.75;
  const dimensions = imageSizes.get(element.getAttribute('src') ?? '');
  const imageWidth = isLandscapeA || isLandscapeB ? metrics.columnWidth + metrics.bleedWidth : metrics.columnWidth;
  const height = dimensions && dimensions.width > 0 ? Math.min(ratio * metrics.viewportHeight, (imageWidth * dimensions.height) / dimensions.width) : 0;
  return [{ marginTop: isLandscapeA ? 24 : isLandscapeB ? 32 : 0, height, marginBottom: isLandscapeA ? 24 : isLandscapeB ? 32 : metrics.rootFontSize }];
}

function createHeadingBlock(element: Element, nextTagName: string, metrics: LayoutMetrics): FlowBlock {
  const isHeading2 = element.tagName === 'H2';
  const fontSize = (isHeading2 ? 1.75 : 1.25) * metrics.rootFontSize;
  const lines = measureTextLines(element, metrics.columnWidth, { size: fontSize, weight: 600, family: metrics.titleFont, serif: metrics.serifFont });
  const isNextHeading = nextTagName === 'H2' || nextTagName === 'H3';
  const marginBottom = nextTagName === 'P' ? 0 : isNextHeading ? metrics.headingGap : (isHeading2 ? 1 : 0.5) * metrics.rootFontSize;
  return { marginTop: (isHeading2 ? 1.5 : 1) * metrics.rootFontSize, height: lines * fontSize * metrics.lineHeight, marginBottom, keepWithNext: true };
}

function createParagraphBlock(element: Element, nextTagName: string, metrics: LayoutMetrics): FlowBlock {
  const hasOnlyStrong = element.children.length === 1 && element.children[0].tagName === 'STRONG';
  const isSubheading = hasOnlyStrong && (element.textContent ?? '').trim() === (element.children[0].textContent ?? '').trim();
  const isNextHeading = nextTagName === 'H2' || nextTagName === 'H3';
  const marginBottom = hasOnlyStrong ? 0.2 * metrics.rootFontSize : isNextHeading ? metrics.headingGap : 0.5 * metrics.rootFontSize;
  return { marginTop: 0, height: measureTextLines(element, metrics.columnWidth, metrics.bodyFont) * metrics.rootFontSize * metrics.lineHeight, marginBottom, keepWithNext: isSubheading };
}

function createListBlocks(element: Element, metrics: LayoutMetrics): readonly FlowBlock[] {
  return Array.from(element.children).flatMap(listItem => {
    const lineCount = measureTextLines(listItem, metrics.columnWidth, metrics.bodyFont);
    return Array.from({ length: lineCount }, (_, lineIndex) => ({
      marginTop: 0, height: metrics.rootFontSize * metrics.lineHeight, marginBottom: lineIndex === lineCount - 1 ? 0.75 * metrics.rootFontSize : 0
    }));
  });
}

function createTableBlocks(element: Element, metrics: LayoutMetrics): readonly FlowBlock[] {
  return Array.from(element.querySelectorAll('tr')).map(row => {
    const cells = Array.from(row.children);
    const cellWidth = Math.max(1, metrics.columnWidth / Math.max(1, cells.length));
    const lines = Math.max(1, ...cells.map(cell => measureTextLines(cell, cellWidth, metrics.bodyFont)));
    return { marginTop: 0, height: lines * metrics.rootFontSize * metrics.lineHeight + 4, marginBottom: 0 };
  });
}

function buildFallbackBlocks(host: HTMLElement, page: CmsRouteData, options: EstimateOptions): { readonly blocks: readonly FlowBlock[]; readonly columnHeight: number } {
  const metrics = readLayoutMetrics(host, options);
  const titleLines = measureTextLines(page.title, metrics.columnWidth, metrics.titleFontSpec);
  const blocks: FlowBlock[] = [{ marginTop: 0, height: 14.4 + 2 * metrics.rootFontSize + titleLines * 2.25 * metrics.rootFontSize * metrics.lineHeight, marginBottom: metrics.rootFontSize, keepWithNext: true }];
  const elements = Array.from(new DOMParser().parseFromString(page.content, 'text/html').body.children);
  for (let index = 0; index < elements.length; index++) {
    const [element, nextTagName] = [elements[index], elements[index + 1]?.tagName ?? ''];
    if (element.tagName === 'IMG') blocks.push(...createImageBlocks(element, metrics, options.imageSizes));
    else if (element.tagName === 'H2' || element.tagName === 'H3') blocks.push(createHeadingBlock(element, nextTagName, metrics));
    else if (element.tagName === 'P') blocks.push(createParagraphBlock(element, nextTagName, metrics));
    else if (element.tagName === 'UL' || element.tagName === 'OL') blocks.push(...createListBlocks(element, metrics));
    else if (element.tagName === 'TABLE') blocks.push(...createTableBlocks(element, metrics));
    else if (element.tagName === 'FIGURE' && blocks.length > 0) blocks[blocks.length - 1] = { ...blocks[blocks.length - 1], marginBottom: Math.max(blocks[blocks.length - 1].marginBottom, metrics.rootFontSize) };
  }
  return { blocks, columnHeight: metrics.columnHeight };
}

function createChapterProbe(host: HTMLElement, hostAttributeName: string): HTMLElement {
  const bounds = host.getBoundingClientRect();
  const [probeWidth, probeHeight] = [bounds.width > 0 ? bounds.width : host.clientWidth, bounds.height > 0 ? bounds.height : host.clientHeight];
  const probe = document.createElement('div');
  if (hostAttributeName) probe.setAttribute(hostAttributeName, '');
  probe.style.cssText = `position:absolute;top:0;left:0;width:${probeWidth}px;height:${probeHeight}px;visibility:hidden;pointer-events:none;z-index:-1;`;
  return probe;
}

function populateProbeContent(
  probe: HTMLElement, host: HTMLElement, context: { readonly page: CmsRouteData; readonly options: EstimateOptions; readonly scopeAttribute: string }
): void {
  const { page, options, scopeAttribute } = context;
  const [header, numberElement, titleElement, body] = ['header', 'div', 'h1', 'article'].map(tag => document.createElement(tag));
  [header.className, numberElement.className, titleElement.className, body.className] = ['page-header', 'page-number', 'page-title', 'page-body drop-cap'];
  const locationLabel = page.metadata?.location ?? page.location ?? '';
  const chapterPrefix = host.querySelector('.page-number')?.textContent?.trim().split(/\s+/)[0] || 'Chapter';
  const parts = splitChapterCover(page.content);
  [numberElement.textContent, titleElement.textContent, body.innerHTML] = [locationLabel ? `${chapterPrefix} ${locationLabel}` : '', page.title, parts.body];
  if (scopeAttribute) [header, numberElement, titleElement, body].forEach(node => node.setAttribute(scopeAttribute, ''));
  body.querySelectorAll('img').forEach(image => {
    const dimensions = options.imageSizes.get(image.getAttribute('src') ?? '');
    if (dimensions && dimensions.width > 0 && !image.classList.contains('img-feature')) [image.width, image.height] = [dimensions.width, dimensions.height];
  });
  header.append(numberElement, titleElement);
  probe.append(header, body);
  prependProbeCover(probe, parts.cover, scopeAttribute);
}

function measureChapterWithDom(host: HTMLElement, page: CmsRouteData, options: EstimateOptions): number {
  const parent = host.parentElement;
  if (!parent || host.clientWidth <= 0 || host.clientHeight <= 0) return 0;
  const hostStyles = getComputedStyle(host);
  if (hostStyles.columnCount === 'auto' && !(parseFloat(hostStyles.columnWidth) > 0)) return 0;
  const hostAttribute = Array.from(host.attributes).find(attribute => attribute.name.startsWith('_nghost-'));
  const scopeAttribute = hostAttribute ? `_ngcontent-${hostAttribute.name.slice(8)}` : '';
  const probe = createChapterProbe(host, hostAttribute?.name ?? '');
  populateProbeContent(probe, host, { page, options, scopeAttribute });
  parent.appendChild(probe);
  try {
    const columnWidth = options.isDesktop ? host.clientWidth / 2 : host.clientWidth;
    if (probe.scrollWidth <= 0 || columnWidth <= 0) return 0;
    let totalColumns = Math.max(1, Math.round(probe.scrollWidth / columnWidth));
    if (options.isDesktop && totalColumns % 2 !== 0) {
      const blankPage = document.createElement('div');
      blankPage.className = 'page-blank';
      if (scopeAttribute) blankPage.setAttribute(scopeAttribute, '');
      probe.appendChild(blankPage);
      totalColumns = Math.max(1, Math.round(probe.scrollWidth / columnWidth));
    }
    return totalColumns;
  } finally {
    probe.remove();
  }
}

export function estimateChapterPageCount(host: HTMLElement, page: CmsRouteData, options: EstimateOptions): number {
  const measuredColumns = measureChapterWithDom(host, page, options);
  if (measuredColumns > 0) return measuredColumns;
  const { blocks, columnHeight } = buildFallbackBlocks(host, page, options);
  return countColumnPages(blocks, { columnHeight, isDesktop: options.isDesktop });
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush, selector: 'website-chapter', standalone: true,
  imports: [TranslatePipe], templateUrl: './chapter.html', styleUrl: './chapter.scss',
  hostDirectives: [{ directive: BookNavigationDirective, outputs: ['pageMeasured'] }],
  host: { '(pageMeasured)': 'onPageMeasured($event)' }
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
  private readonly routingService = inject(RoutingService);
  private readonly contentRepo = inject(CONTENT_READ_REPOSITORY);
  public readonly stateService = inject(StateService);

  private readonly routePageData = signal<CmsRouteData | null>(null);
  private readonly basePageData = computed<CmsRouteData | null>(() => {
    const pageId = this.pageId() ?? '';
    const title = this.title() ?? '';
    const content = this.content() ?? '';
    if (!pageId && !title && !content) return this.routePageData();
    return {
      pageId, title, lang: this.lang() ?? '',
      type: toPageType(this.type(), PageType.Chapter), content,
      metadata: this.metadata() ?? { location: this.location() }, location: this.location()
    };
  });

  public readonly pageData = computed<CmsRouteData | null>(() => {
    const base = this.basePageData();
    const loaded = !base || base.content ? null : this.bookFacade.currentChapter();
    if (!base || !loaded || loaded.id !== base.pageId) return base;
    return {
      ...base, title: loaded.title || base.title, lang: loaded.lang || base.lang, type: loaded.type,
      content: loaded.content, metadata: loaded.metadata ?? base.metadata,
      location: loaded.metadata?.location ?? base.location
    };
  });

  protected readonly parts = computed(() => splitChapterCover(this.pageData()?.content ?? ''));

  protected readonly needsBlankPage = this.nav.needsBlankPage.asReadonly();
  private readonly destroy$ = new Subject<void>();
  private landsOnLastPage = false;
  private pendingAssets = 0;

  constructor() {
    this.bookService.navigationRequest
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => { this.landsOnLastPage = false; });

    effect(() => {
      const baseData = this.basePageData();
      if (baseData && !baseData.content && baseData.pageId) void this.bookFacade.loadChapter(baseData.pageId);
    });
    effect(() => {
      if (this.bookService.dynamicRouteOrder().length > 0 && this.stateService.isBrowser) {
        void this.stateService.syncAllChapterPageCounts(this.nav.hostEl, this.paginationDeps(), estimateChapterPageCount);
      }
    });

    effect((onCleanup) => {
      const data = this.pageData();
      if (!data || !data.content || !this.stateService.isBrowser) return;
      this.nav.resetBlankPage();
      const controller = new AbortController();
      const rafId = requestAnimationFrame(() => {
        if (controller.signal.aborted) return;
        this.landsOnLastPage = this.nav.isTurningBack();
        if (this.landsOnLastPage) this.scrollToLastPage();
        else this.nav.scrollToStart();
        this.observeContentAssets(controller);
      });
      const timerId = setTimeout(() => {
        if (this.landsOnLastPage) this.scrollToLastPage();
        this.nav.measurePage();
      }, 100);
      onCleanup(() => {
        controller.abort();
        this.pendingAssets = 0;
        cancelAnimationFrame(rafId);
        clearTimeout(timerId);
      });
    });
  }

  ngOnInit(): void { this.route.data.pipe(takeUntil(this.destroy$)).subscribe(data => this.applyRouteData(data)); }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  protected onPageMeasured(totalColumns: number): void {
    const deps = this.paginationDeps();
    this.bookService.setPageCount(this.nav.currentSlug, totalColumns);
    this.stateService.recordMeasuredChapterPage(this.nav.hostEl, deps, { slug: this.nav.currentSlug, totalCols: totalColumns });
    if (this.landsOnLastPage) {
      this.scrollToLastPage();
      if (this.pendingAssets === 0) this.landsOnLastPage = false;
    }
    void this.stateService.syncAllChapterPageCounts(this.nav.hostEl, deps, estimateChapterPageCount);
  }

  private applyRouteData(value: unknown): void {
    if (!isRecord(value)) return this.routePageData.set(null);
    const readString = (key: string): string => (typeof value[key] === 'string' ? value[key] : '');
    const [pageId, title, content] = [readString('pageId'), readString('title'), readString('content')];
    if (!pageId && !title && !content) return this.routePageData.set(null);
    this.routePageData.set({
      pageId, title, lang: readString('lang'), type: toPageType(value['type'], PageType.Chapter),
      content, metadata: isRecord(value['metadata']) ? value['metadata'] : undefined,
      location: typeof value['location'] === 'string' ? value['location'] : undefined
    });
  }

  private paginationDeps(): BookPaginationDeps {
    return {
      bookService: this.bookService, routingService: this.routingService,
      contentRepo: this.contentRepo, isDesktop: this.stateService.isDesktop()
    };
  }

  private observeContentAssets(controller: AbortController): void {
    this.pendingAssets = 0;
    const handleAssetSettled = (): void => {
      this.pendingAssets = Math.max(0, this.pendingAssets - 1);
      this.nav.measurePage();
    };
    this.nav.hostEl.querySelectorAll('img').forEach(image => {
      if (getComputedStyle(image).display === 'none') return;
      if (image.loading === 'lazy') image.loading = 'eager';
      if (image.complete) return;
      this.pendingAssets++;
      image.addEventListener('load', handleAssetSettled, { once: true, signal: controller.signal });
      image.addEventListener('error', handleAssetSettled, { once: true, signal: controller.signal });
    });
    if (document.fonts && document.fonts.status !== 'loaded') {
      this.pendingAssets++;
      void document.fonts.ready.then(() => { if (!controller.signal.aborted) handleAssetSettled(); });
    }
  }

  private scrollToLastPage(): void {
    this.nav.hostEl.scrollTo({ left: this.nav.hostEl.scrollWidth, behavior: 'instant' });
    this.nav.updateCurrentPage();
  }
}
