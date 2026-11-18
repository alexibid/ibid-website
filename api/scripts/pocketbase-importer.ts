import type { PageInput, UrlInput } from '../src/content/content.model.js';
import { countByTypeAndLang, rewriteMediaUrls, toPageInput } from './pocketbase-mapping.js';

export class ImportRefusedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImportRefusedError';
  }
}

export interface PocketbaseSource {
  pages(): Promise<readonly unknown[]>;
  urls(): Promise<readonly unknown[]>;
  media(): Promise<readonly unknown[]>;
}

export interface ImportTarget {
  countPages(): Promise<number>;
  importAll(batch: {
    readonly pages: readonly { readonly id: string; readonly input: PageInput }[];
    readonly urls: readonly UrlInput[];
    readonly media: readonly unknown[];
  }): Promise<void>;
  countByTypeAndLang(): Promise<Record<string, number>>;
}

export interface ImportReport {
  readonly counts: Record<string, number>;
}

export class PocketbaseImporter {
  constructor(
    private readonly source: PocketbaseSource,
    private readonly target: ImportTarget,
    private readonly idGenerator: () => string = () => crypto.randomUUID(),
  ) {}

  async run(): Promise<ImportReport> {
    const existingCount = await this.target.countPages();
    if (existingCount > 0) {
      throw new ImportRefusedError('Database already has pages');
    }

    let rawPages: readonly unknown[];
    let rawUrls: readonly unknown[];
    let rawMedia: readonly unknown[];

    try {
      rawPages = await this.source.pages();
      rawUrls = await this.source.urls();
      rawMedia = await this.source.media();
    } catch (error) {
      throw new Error(`PocketBase connection failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    if (rawPages.length === 0) {
      await this.target.importAll({ pages: [], urls: [], media: [] });
      const counts = await this.target.countByTypeAndLang();
      return { counts };
    }

    const mediaMap = new Map<string, string>();
    for (const item of rawMedia) {
      if (typeof item === 'object' && item !== null && 'fileName' in item) {
        const fileName = String((item as { fileName: unknown }).fileName);
        mediaMap.set(fileName, fileName);
      }
    }

    const pageIdMap = new Map<string, string>();
    const intermediatePages = rawPages.map((raw) => {
      const parsed = toPageInput(raw);
      const newId = this.idGenerator();
      pageIdMap.set(parsed.pbId, newId);
      return { parsed, newId };
    });

    const pages = intermediatePages.map(({ parsed, newId }) => {
      const rewrittenContent = rewriteMediaUrls(parsed.content, mediaMap);
      const input: PageInput = {
        title: parsed.title,
        content: rewrittenContent,
        type: parsed.type,
        lang: parsed.lang,
        location: parsed.location,
        metadata: parsed.metadata,
      };
      return { id: newId, input };
    });

    const urls: UrlInput[] = [];
    for (const raw of rawUrls) {
      if (typeof raw !== 'object' || raw === null) {
        throw new ImportRefusedError('Invalid URL record');
      }
      const rec = raw as Record<string, unknown>;
      const rawPageId = String(rec.page_id ?? rec.pageId ?? '');
      const newPageId = pageIdMap.get(rawPageId);
      if (newPageId === undefined) {
        throw new ImportRefusedError(`URL references missing page: ${rawPageId}`);
      }
      urls.push({
        url: String(rec.url),
        lang: rec.lang as UrlInput['lang'],
        pageId: newPageId,
      });
    }

    await this.target.importAll({ pages, urls, media: rawMedia });

    const expectedCounts = countByTypeAndLang(pages.map((p) => p.input));
    const actualCounts = await this.target.countByTypeAndLang();

    for (const [key, count] of Object.entries(expectedCounts)) {
      if (actualCounts[key] !== count) {
        throw new Error(`Count mismatch for ${key}: expected ${count}, got ${actualCounts[key] ?? 0}`);
      }
    }

    return { counts: actualCounts };
  }
}
