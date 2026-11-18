import type { Page, Url } from '../content/content.model.js';
import type { ContentSnapshot, SnapshotPage, SnapshotUrl } from './content-snapshot.js';

export interface PagesSource {
  list(): Promise<readonly Page[]>;
}

export interface UrlsSource {
  list(): Promise<readonly Url[]>;
}

const TYPE_ORDER: Readonly<Record<string, number>> = {
  chapter: 1,
  exit: 2,
  home: 3,
};

export class SnapshotBuilder {
  constructor(
    private readonly pagesSource: PagesSource,
    private readonly urlsSource: UrlsSource,
  ) {}

  async build(): Promise<ContentSnapshot> {
    const rawPages = await this.pagesSource.list();
    const rawUrls = await this.urlsSource.list();

    if (rawPages.length === 0 && rawUrls.length === 0) {
      return { version: 1, pages: [], urls: [], media: [] };
    }

    const mediaSet = new Set<string>();
    const pages: SnapshotPage[] = rawPages.map((page) => {
      const rewrittenContent = page.content.replace(/\/api\/v1\/media\/([a-zA-Z0-9_.-]+)/g, (_match, filename: string) => {
        mediaSet.add(filename);
        return `/content-media/${filename}`;
      });

      const snapshotPage: SnapshotPage = {
        id: page.id,
        title: page.title,
        content: rewrittenContent,
        type: page.type,
        lang: page.lang,
        location: page.location,
        metadata: page.metadata ?? {},
      };
      return snapshotPage;
    });

    pages.sort((a, b) => {
      const orderA = TYPE_ORDER[a.type] ?? 99;
      const orderB = TYPE_ORDER[b.type] ?? 99;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      const langDiff = a.lang.localeCompare(b.lang);
      if (langDiff !== 0) {
        return langDiff;
      }
      const locDiff = (a.location ?? '').localeCompare(b.location ?? '');
      if (locDiff !== 0) {
        return locDiff;
      }
      return a.id.localeCompare(b.id);
    });

    const urls: SnapshotUrl[] = rawUrls
      .map((u) => ({
        url: u.url,
        lang: u.lang,
        pageId: u.pageId,
      }))
      .sort((a, b) => a.url.localeCompare(b.url) || a.lang.localeCompare(b.lang) || a.pageId.localeCompare(b.pageId));

    const media = Array.from(mediaSet).sort();

    return {
      version: 1,
      pages,
      urls,
      media,
    };
  }
}
