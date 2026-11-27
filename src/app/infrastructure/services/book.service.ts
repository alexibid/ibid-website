import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Subject } from 'rxjs';
import { PageType } from '../../domain/models/page-type.enum';
import { isRecord } from '../../domain/models/static-routes.model';

export type ImageDimensions = { readonly width: number; readonly height: number };
export type LineFontSpec = { readonly size: number; readonly weight: number; readonly family: string; readonly serif: string };
export type FlowBlock = { readonly marginTop: number; readonly height: number; readonly marginBottom: number; readonly keepWithNext?: boolean; readonly fullColumn?: boolean };
export type EstimateOptions = { readonly isDesktop: boolean; readonly imageSizes: ReadonlyMap<string, ImageDimensions> };
export type LayoutMetrics = {
  readonly columnWidth: number; readonly columnHeight: number; readonly bleedWidth: number;
  readonly viewportHeight: number; readonly rootFontSize: number; readonly lineHeight: number;
  readonly headingGap: number; readonly isDesktop: boolean; readonly bodyFont: LineFontSpec;
  readonly titleFontSpec: LineFontSpec; readonly titleFont: string; readonly serifFont: string;
};
type LineWrapState = { lineCount: number; lineWidth: number; spaceWidth: number };

const imageDimensionCache = new Map<string, ImageDimensions>();
const wordWidthCache = new Map<string, number>();
let textCanvasContext: CanvasRenderingContext2D | null | undefined;

function measureTokenWidth(token: string, font: string, fontSize: number): number {
  const cacheKey = `${font}\0${token}`;
  const cachedWidth = wordWidthCache.get(cacheKey);
  if (cachedWidth !== undefined) return cachedWidth;
  if (textCanvasContext === undefined) textCanvasContext = document.createElement('canvas').getContext('2d');
  if (!textCanvasContext) return token.length * fontSize * 0.48;
  textCanvasContext.font = font;
  const width = textCanvasContext.measureText(token).width;
  wordWidthCache.set(cacheKey, width);
  return width;
}

function wrapTextTokens(
  text: string,
  font: string,
  context: { readonly maxWidth: number; readonly fontSize: number; readonly state: LineWrapState }
): void {
  const { maxWidth, fontSize, state } = context;
  for (const part of text.replace(/\s+/g, ' ').split(/(\s+|(?<=[-–—/]))/)) {
    if (!part) continue;
    if (part === ' ') {
      if (state.lineWidth > 0) state.spaceWidth = measureTokenWidth(' ', font, fontSize);
      continue;
    }
    const tokenWidth = measureTokenWidth(part, font, fontSize);
    if (state.lineWidth > 0 && state.lineWidth + state.spaceWidth + tokenWidth > maxWidth + 0.25) {
      state.lineCount += 1;
      state.lineWidth = tokenWidth;
      state.spaceWidth = 0;
    } else {
      state.lineWidth += state.spaceWidth + tokenWidth;
      state.spaceWidth = 0;
    }
  }
}

function walkFormattedText(
  node: Node,
  style: { readonly weight: number; readonly italic: boolean },
  context: { readonly maxWidth: number; readonly spec: LineFontSpec; readonly state: LineWrapState }
): void {
  const { spec, state } = context;
  if (node.nodeType === Node.TEXT_NODE && node.textContent) {
    const fontStyle = style.italic ? 'italic ' : '';
    const fontFamily = style.italic ? spec.serif : spec.family;
    const font = `${fontStyle}${style.weight} ${spec.size}px ${fontFamily}`;
    wrapTextTokens(node.textContent, font, { maxWidth: context.maxWidth, fontSize: spec.size, state });
  } else if (node instanceof Element && node.tagName === 'BR') {
    state.lineCount += 1;
    state.lineWidth = 0;
    state.spaceWidth = 0;
  } else if (node instanceof Element) {
    const weight = node.tagName === 'STRONG' || node.tagName === 'B' ? 700 : style.weight;
    const italic = style.italic || node.tagName === 'EM' || node.tagName === 'I';
    node.childNodes.forEach(child => walkFormattedText(child, { weight, italic }, context));
  }
}

export function measureTextLines(source: Node | string, maxWidth: number, spec: LineFontSpec): number {
  const state: LineWrapState = { lineCount: 1, lineWidth: 0, spaceWidth: 0 };
  if (typeof source === 'string') {
    const font = `italic ${spec.weight} ${spec.size}px ${spec.family}`;
    wrapTextTokens(source, font, { maxWidth, fontSize: spec.size, state });
    return state.lineCount;
  }
  walkFormattedText(source, { weight: spec.weight, italic: false }, { maxWidth, spec, state });
  return state.lineCount;
}

function measureKeepGroupHeight(blocks: readonly FlowBlock[], startIndex: number): number {
  let totalHeight = blocks[startIndex].height;
  for (let index = startIndex; blocks[index].keepWithNext && index + 1 < blocks.length && !blocks[index + 1].fullColumn; index++) {
    totalHeight += Math.max(blocks[index].marginBottom, blocks[index + 1].marginTop) + blocks[index + 1].height;
  }
  return totalHeight;
}

export function countColumnPages(
  blocks: readonly FlowBlock[],
  limits: { readonly columnHeight: number; readonly isDesktop: boolean }
): number {
  let [columnCount, usedHeight, previousMargin] = [1, 0, 0];
  for (let index = 0; index < blocks.length; index++) {
    const block = blocks[index];
    if (block.fullColumn) {
      if (usedHeight > 0) columnCount++;
      if (index < blocks.length - 1) columnCount++;
      [usedHeight, previousMargin] = [0, 0];
      continue;
    }
    if (usedHeight > 0 && usedHeight + Math.max(previousMargin, block.marginTop) + measureKeepGroupHeight(blocks, index) > limits.columnHeight + 0.25) {
      columnCount++;
      [usedHeight, previousMargin] = [0, 0];
    }
    usedHeight += (usedHeight === 0 ? 0 : Math.max(previousMargin, block.marginTop)) + block.height;
    previousMargin = block.marginBottom;
  }
  return limits.isDesktop ? columnCount + (columnCount % 2) : columnCount;
}

export function readStoredPageCounts(cacheKey: string): Map<string, number> {
  const counts = new Map<string, number>();
  try {
    const raw: unknown = JSON.parse(sessionStorage.getItem(`ibid-pages:${cacheKey}`) || 'null');
    if (isRecord(raw)) {
      Object.entries(raw).forEach(([slug, count]) => {
        if (typeof count === 'number' && count > 0) counts.set(slug, count);
      });
    }
  } catch {}
  return counts;
}

export function writeStoredPageCounts(cacheKey: string, counts: ReadonlyMap<string, number>): void {
  try {
    sessionStorage.setItem(`ibid-pages:${cacheKey}`, JSON.stringify(Object.fromEntries(counts)));
  } catch {}
}

export function buildPaginationViewportKey(
  host: HTMLElement,
  context: { readonly isDesktop: boolean; readonly signature: string }
): string {
  const fontState = document.fonts?.status === 'loaded' ? 'f1' : 'f0';
  return `${host.clientWidth}x${host.clientHeight}:${context.isDesktop}:${fontState}:${context.signature}`;
}

function loadImageDimensions(url: string): Promise<void> {
  return new Promise(resolve => {
    const image = new Image();
    image.onload = image.onerror = (): void => {
      if (image.naturalWidth > 0) {
        imageDimensionCache.set(url, { width: image.naturalWidth, height: image.naturalHeight });
      }
      resolve();
    };
    image.src = url;
  });
}

export async function preloadChapterImageSizes(htmlContents: readonly string[]): Promise<ReadonlyMap<string, ImageDimensions>> {
  const missingUrls = new Set<string>();
  for (const html of htmlContents) {
    for (const match of html.matchAll(/<img[^>]+src="([^"]+)"/gi)) {
      if (!imageDimensionCache.has(match[1])) missingUrls.add(match[1]);
    }
  }
  if (missingUrls.size > 0) {
    await Promise.race([Promise.all([...missingUrls].map(loadImageDimensions)), new Promise(resolve => setTimeout(resolve, 5000))]);
  }
  return imageDimensionCache;
}

export function readLayoutMetrics(host: HTMLElement, options: EstimateOptions): LayoutMetrics {
  const { isDesktop } = options;
  const styles = getComputedStyle(host);
  const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const parsePixels = (rawValue: string, fallback: number): number => parseFloat(rawValue) || fallback;
  const [paddingLeft, paddingRight] = [parsePixels(styles.paddingLeft, isDesktop ? 60 : 40), parsePixels(styles.paddingRight, isDesktop ? 60 : 30)];
  const columnHeight = Math.max(1, host.clientHeight - parsePixels(styles.paddingTop, isDesktop ? 50 : 20) - parsePixels(styles.paddingBottom, isDesktop ? 50 : 20));
  const contentWidth = host.clientWidth - paddingLeft - paddingRight;
  const columnWidth = Math.max(1, isDesktop ? (contentWidth - parsePixels(styles.columnGap, 120)) / 2 : contentWidth);
  const gapRaw = styles.getPropertyValue('--book-heading-gap').trim();
  const readFont = (property: string, fallback: string): string => styles.getPropertyValue(property).trim() || fallback;
  const [bodyFamily, titleFont, serifFont] = [readFont('--font-body', "'Noto Rashi Hebrew', serif"), readFont('--font-title', "'Newsreader', serif"), readFont('--font-serif', "'Newsreader', serif")];
  return {
    columnWidth, columnHeight, bleedWidth: isDesktop ? 2 * paddingRight : paddingLeft + paddingRight,
    viewportHeight: window.innerHeight || host.clientHeight, rootFontSize,
    lineHeight: parsePixels(styles.getPropertyValue('--book-line-height'), 1.1),
    headingGap: gapRaw.endsWith('rem') ? parseFloat(gapRaw) * rootFontSize : parsePixels(gapRaw, 0.5 * rootFontSize),
    isDesktop, bodyFont: { size: rootFontSize, weight: 400, family: bodyFamily, serif: serifFont },
    titleFontSpec: { size: 2.25 * rootFontSize, weight: 400, family: titleFont, serif: serifFont },
    titleFont, serifFont
  };
}

@Injectable({
  providedIn: 'root'
})
export class BookService {
  private readonly chapterPageCounts = new Map<string, number>();
  private readonly routeTypes = new Map<string, PageType>();
  private flipTimer: ReturnType<typeof setTimeout> | undefined;

  public readonly pageCountsUpdated = signal<number>(0);
  public readonly activeChapterSlug = signal<string>('');
  public readonly activePageType = signal<PageType | null>(null);
  public readonly currentChapterPage = signal<number>(1);
  public readonly isFlipping = signal<boolean>(false);
  public readonly flipDirection = signal<number>(1);
  public readonly dynamicRouteOrder = signal<string[]>([]);
  public readonly routesMetadata = signal<{ slug: string; title: string; type: PageType }[]>([]);
  public readonly indexRevealRequested = signal<boolean>(false);

  public readonly navigationRequest = new Subject<number>();

  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  triggerFlip(direction: number): void {
    clearTimeout(this.flipTimer);
    this.flipDirection.set(direction);
    this.isFlipping.set(true);
    this.flipTimer = setTimeout(() => {
      this.flipTimer = undefined;
      this.isFlipping.set(false);
    }, 900);
  }

  setRouteOrder(routes: { slug: string; title: string; type: PageType }[]): void {
    const slugs = routes.map(route => route.slug);
    this.dynamicRouteOrder.set(slugs);
    this.routesMetadata.set(routes);

    this.routeTypes.clear();
    routes.forEach(route => this.routeTypes.set(route.slug, route.type));
  }

  setPageCount(slug: string, count: number): void {
    if (this.chapterPageCounts.get(slug) !== count) {
      this.chapterPageCounts.set(slug, count);
      this.pageCountsUpdated.update(value => value + 1);
    }
  }

  getChapterPages(slug: string): number {
    return this.chapterPageCounts.get(slug) || 1;
  }

  getChapterIndex(slug: string): number {
    let index = 0;
    for (const route of this.dynamicRouteOrder()) {
      if (this.routeTypes.get(route) === PageType.Chapter) {
        index++;
      }
      if (route === slug) return index;
    }
    return index;
  }

  getStartingPage(slug: string): number {
    let startingPage = 1;
    for (const route of this.dynamicRouteOrder()) {
      if (route === slug) break;
      if (this.routeTypes.get(route) === PageType.Chapter) {
        startingPage += this.chapterPageCounts.get(route) || 1;
      }
    }
    return startingPage;
  }

  getTotalPages(): number {
    let total = 0;
    for (const route of this.dynamicRouteOrder()) {
      if (this.routeTypes.get(route) === PageType.Chapter) {
        total += this.chapterPageCounts.get(route) || 1;
      }
    }
    return total;
  }
}
