import { Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ConfigService } from '../config/config.service';
import type { DatabaseClient } from '../database/database.provider';
import { media, pages, urls } from '../database/schema';
import { StaticExportService } from '../static-export/static-export.service';
import type { FileSystemPort } from '../storage/file-system.service';
import { cleanEncodedHtml } from './content-encoding.util';
import {
  SUPPORTED_LANGS,
  parsePortfolioContentFile,
  resolvePortfolioEntryId,
  validatePortfolioDataset,
  type PortfolioEntry,
  type PortfolioSyncResult,
  type SyncPortfolioOptions,
} from './content/portfolio-content.types';

export const PORTFOLIO_CONTENT_DEPS = Symbol('PORTFOLIO_CONTENT_DEPS');

export interface PortfolioContentDeps {
  readonly db: DatabaseClient;
  readonly fs: FileSystemPort;
  readonly config: ConfigService;
  readonly staticExport?: StaticExportService;
}

@Injectable()
export class PortfolioContentService {
  private readonly db: DatabaseClient;
  private readonly fs: FileSystemPort;
  private readonly config: ConfigService;
  private readonly staticExport?: StaticExportService;

  constructor(@Inject(PORTFOLIO_CONTENT_DEPS) deps: PortfolioContentDeps) {
    this.db = deps.db;
    this.fs = deps.fs;
    this.config = deps.config;
    this.staticExport = deps.staticExport;
  }

  async repairExistingEncoding(targetDb: DatabaseClient = this.db): Promise<number> {
    const existingRows = await targetDb.select().from(pages);
    if (existingRows.length === 0) {
      return 0;
    }

    let repairedCount = 0;
    await targetDb.transaction(async (tx) => {
      repairedCount = await repairPageRows(tx, existingRows);
    });
    return repairedCount;
  }

  validateEntries(entries: readonly PortfolioEntry[]): void {
    validatePortfolioDataset(entries);
  }

  async syncAll(options?: SyncPortfolioOptions): Promise<PortfolioSyncResult> {
    const contentDir = options?.contentDir ?? resolveDefaultContentDir();
    const exportStatic = options?.exportStatic ?? false;

    const entries = await this.loadAllContentEntries(contentDir);
    this.validateEntries(entries);

    const existingMediaRows = await this.db.select().from(media);
    let pagesRepaired = 0;

    await this.db.transaction(async (tx) => {
      const existingPages = await tx.select().from(pages);
      pagesRepaired = await repairPageRows(tx, existingPages);
      await tx.delete(urls).where(sql`1 = 1`);
      await tx.delete(pages).where(sql`1 = 1`);

      await tx.insert(pages).values(
        entries.map((entry) => ({
          id: resolvePortfolioEntryId(entry),
          title: entry.title,
          content: entry.content,
          type: entry.type,
          lang: entry.lang,
          location: entry.location,
          metadata: { location: entry.location },
        })),
      );

      await tx.insert(urls).values(
        entries.map((entry) => {
          const pageId = resolvePortfolioEntryId(entry);
          return {
            id: `${pageId}-url`,
            url: entry.slug,
            lang: entry.lang,
            pageId,
          };
        }),
      );
    });

    if (exportStatic) {
      const exporter =
        this.staticExport ??
        new StaticExportService(this.db, this.fs, this.config);
      await exporter.exportAll();
    }

    return {
      pagesRepaired,
      pagesSynced: entries.length,
      urlsSynced: entries.length,
      mediaPreserved: existingMediaRows.length,
      staticExported: exportStatic,
      countsByTypeAndLang: countEntriesByTypeAndLang(entries),
    };
  }

  private async loadAllContentEntries(contentDir: string): Promise<PortfolioEntry[]> {
    const loaded: PortfolioEntry[] = [];
    for (const lang of SUPPORTED_LANGS) {
      const filePath = `${contentDir}/${lang}.json`;
      const rawJson = await this.fs.readFile(filePath);
      loaded.push(...parsePortfolioContentFile(rawJson, lang, filePath));
    }
    return loaded;
  }
}

async function repairPageRows(
  tx: DatabaseClient,
  rows: readonly Record<string, unknown>[],
): Promise<number> {
  let repairedCount = 0;
  for (const row of rows) {
    const id = typeof row['id'] === 'string' ? row['id'] : '';
    const title = typeof row['title'] === 'string' ? row['title'] : '';
    const content = typeof row['content'] === 'string' ? row['content'] : '';
    const cleanedTitle = cleanEncodedHtml(title);
    const cleanedContent = cleanEncodedHtml(content);

    if (id && (cleanedTitle !== title || cleanedContent !== content)) {
      await tx
        .update(pages)
        .set({ title: cleanedTitle, content: cleanedContent })
        .where(eq(pages.id, id));
      repairedCount += 1;
    }
  }
  return repairedCount;
}

function resolveDefaultContentDir(): string {
  const localDir = resolve(__dirname, 'content');
  if (existsSync(resolve(localDir, 'pt.json'))) {
    return localDir;
  }
  const sourceFallback = resolve(__dirname, '../../src/cli/content');
  return existsSync(resolve(sourceFallback, 'pt.json')) ? sourceFallback : localDir;
}

function countEntriesByTypeAndLang(
  entries: readonly PortfolioEntry[],
): Record<string, Record<string, number>> {
  const counts: Record<string, Record<string, number>> = {};
  for (const entry of entries) {
    const byLang = counts[entry.type] ?? {};
    byLang[entry.lang] = (byLang[entry.lang] ?? 0) + 1;
    counts[entry.type] = byLang;
  }
  return counts;
}
