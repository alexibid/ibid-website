import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { PAGE_STYLESHEET_BUNDLES, STYLESHEET_MANIFEST_ID } from '../../domain/constants/page-stylesheets';
import { PageType } from '../../domain/models/page-type.enum';

interface StylesheetFile {
  readonly href: string;
  readonly media: string;
}

type StylesheetManifest = Readonly<Record<string, readonly StylesheetFile[]>>;

const BUNDLE_ATTRIBUTE = 'data-stylesheet';

function isStylesheetFile(value: unknown): value is StylesheetFile {
  return typeof value === 'object' && value !== null
    && typeof Reflect.get(value, 'href') === 'string' && typeof Reflect.get(value, 'media') === 'string';
}

function filesOf(value: unknown): readonly StylesheetFile[] {
  return Array.isArray(value) ? value.filter(isStylesheetFile) : [];
}

function parseManifest(text: string): StylesheetManifest {
  const parsed: unknown = JSON.parse(text);
  const bundles: unknown = typeof parsed === 'object' && parsed !== null ? Reflect.get(parsed, 'bundles') : {};
  if (typeof bundles !== 'object' || bundles === null) return {};
  return Object.fromEntries(Object.entries(bundles).map(([name, files]) => [name, filesOf(files)]));
}

function prefersReducedData(navigator: Navigator): boolean {
  const connection: unknown = Reflect.get(navigator, 'connection');
  return typeof connection === 'object' && connection !== null && Reflect.get(connection, 'saveData') === true;
}

@Injectable({ providedIn: 'root' })
export class PageStylesheetService {
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly manifest = this.readManifest();

  public async loadFor(type: PageType): Promise<void> {
    await Promise.all(this.filesFor(type).map((file) => this.attach(file)));
  }

  public prefetchFor(type: PageType): void {
    const view = this.document.defaultView;
    if (!view || prefersReducedData(view.navigator)) return;
    const prefetchMissing = (): void => this.filesFor(type).filter((file) => !this.findLink(file.href)).forEach((file) => this.prefetch(file));
    if (this.document.readyState === 'complete') prefetchMissing();
    else view.addEventListener('load', prefetchMissing, { once: true });
  }

  public applyDeferredMedia(): void {
    const pending = this.document.head.querySelectorAll<HTMLLinkElement>(`link[${BUNDLE_ATTRIBUTE}][rel="preload"][media]`);
    pending.forEach((link) => {
      if (!this.document.defaultView?.matchMedia(link.media).matches) link.rel = 'stylesheet';
    });
  }

  private readManifest(): StylesheetManifest {
    const text = this.isBrowser ? this.document.getElementById(STYLESHEET_MANIFEST_ID)?.textContent ?? '' : '';
    return text ? parseManifest(text) : {};
  }

  private filesFor(type: PageType): readonly StylesheetFile[] {
    return PAGE_STYLESHEET_BUNDLES[type].flatMap((bundle) => this.manifest[bundle] ?? []);
  }

  private findLink(href: string): HTMLLinkElement | undefined {
    const links = Array.from(this.document.head.querySelectorAll<HTMLLinkElement>(`link[${BUNDLE_ATTRIBUTE}]`));
    return links.find((link) => link.getAttribute('href') === href);
  }

  private attach(file: StylesheetFile): Promise<void> {
    const existing = this.findLink(file.href);
    if (existing?.rel === 'prefetch') existing.remove();
    else if (existing) return Promise.resolve();
    const link = this.createLink('stylesheet', file);
    const applied = this.whenApplied(link, file);
    this.document.head.appendChild(link);
    return applied;
  }

  private prefetch(file: StylesheetFile): void {
    const link = this.createLink('prefetch', file);
    link.as = 'style';
    this.document.head.appendChild(link);
  }

  private createLink(rel: string, file: StylesheetFile): HTMLLinkElement {
    const link = this.document.createElement('link');
    link.rel = rel;
    link.href = file.href;
    if (file.media) link.media = file.media;
    link.setAttribute(BUNDLE_ATTRIBUTE, '');
    return link;
  }

  private whenApplied(link: HTMLLinkElement, file: StylesheetFile): Promise<void> {
    const view = this.document.defaultView;
    if (file.media && !view?.matchMedia(file.media).matches) return Promise.resolve();
    return new Promise((resolve) => {
      link.addEventListener('load', () => resolve(), { once: true });
      link.addEventListener('error', () => resolve(), { once: true });
    });
  }
}
