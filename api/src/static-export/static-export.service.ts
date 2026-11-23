import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { join, resolve, sep } from 'node:path';
import { isRecord } from '../common/type-guards.util';
import { ConfigService } from '../config/config.service';
import { DRIZZLE_DB, type DatabaseClient } from '../database/database.provider';
import { media, pages, urls } from '../database/schema';
import { FILE_SYSTEM, type FileSystemPort } from '../storage/file-system.service';
import { sanitizePageHtml } from './html-sanitizer.util';
import type {
  StaticExportResult,
  StaticMediaEntry,
  StaticPageMetadata,
  StaticRoutesManifest,
  StaticUrlEntry,
} from './static-export.types';

interface PreparedExportPage {
  readonly meta: StaticPageMetadata;
  readonly sanitizedHtml: string;
  readonly filePath: string;
}

@Injectable()
export class StaticExportService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: DatabaseClient,
    @Inject(FILE_SYSTEM) private readonly fs: FileSystemPort,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  async exportAll(): Promise<StaticExportResult> {
    const [pageRows, urlRows, mediaRows] = await Promise.all([
      this.db.select().from(pages),
      this.db.select().from(urls),
      this.db.select().from(media),
    ]);

    const exportPages = pageRows.map((row) => toPreparedPage(row, this.config.staticPagesDir));
    const manifest: StaticRoutesManifest = {
      version: 1,
      pages: exportPages.map((entry) => entry.meta),
      urls: urlRows.map(toStaticUrlEntry),
      media: mediaRows.map(toStaticMediaEntry),
    };
    const prerenderRoutes = buildPrerenderRoutes(manifest.urls);

    await this.fs.mkdir(this.config.staticPagesDir);

    const expectedPaths = new Set<string>();
    for (const page of exportPages) {
      expectedPaths.add(page.filePath);
      await this.fs.writeFileAtomic(page.filePath, page.sanitizedHtml);
    }

    await cleanStaticRoot(this.fs, this.config.staticPagesDir, expectedPaths);

    const routesJsonPath = join(this.config.staticPagesDir, 'routes.json');
    await this.fs.writeFileAtomic(routesJsonPath, `${JSON.stringify(manifest, null, 2)}\n`);
    await this.fs.writeFileAtomic(
      this.config.prerenderRoutesPath,
      `${prerenderRoutes.join('\n')}\n`,
    );

    return {
      pagesExported: exportPages.length,
      urlsExported: manifest.urls.length,
      mediaExported: manifest.media.length,
      prerenderRoutesExported: prerenderRoutes.length,
      manifest,
    };
  }
}

function toPreparedPage(row: Record<string, unknown>, staticPagesDir: string): PreparedExportPage {
  const id = assertSafePathSegment(readString(row, 'id'), 'id');
  const lang = assertSafePathSegment(readString(row, 'lang'), 'lang');
  const rootDir = resolve(staticPagesDir);
  const resolvedTarget = resolve(rootDir, lang, `${id}.html`);
  if (!resolvedTarget.startsWith(`${rootDir}${sep}`)) {
    throw new BadRequestException('Static page path escapes output directory');
  }

  const location = typeof row['location'] === 'string' ? row['location'] : undefined;
  const metadata = isRecord(row['metadata']) ? row['metadata'] : undefined;

  return {
    meta: {
      id,
      title: readString(row, 'title'),
      type: readString(row, 'type'),
      lang,
      ...(location !== undefined ? { location } : {}),
      ...(metadata !== undefined ? { metadata } : {}),
    },
    sanitizedHtml: sanitizePageHtml(readString(row, 'content')),
    filePath: join(staticPagesDir, lang, `${id}.html`),
  };
}

function assertSafePathSegment(value: string, label: string): string {
  if (
    value.length === 0 ||
    value.trim() !== value ||
    value === '.' ||
    value === '..' ||
    value.includes('..') ||
    value.includes('/') ||
    value.includes('\\') ||
    value.includes('\0') ||
    !/^[a-zA-Z0-9._-]+$/.test(value)
  ) {
    throw new BadRequestException(`Invalid ${label} path segment`);
  }
  return value;
}

async function cleanStaticRoot(
  fs: FileSystemPort,
  staticPagesDir: string,
  expectedPaths: ReadonlySet<string>,
): Promise<void> {
  const entries = await fs.readdir(staticPagesDir);
  for (const entry of entries) {
    if (entry.name === 'routes.json') {
      continue;
    }
    const entryPath = join(staticPagesDir, entry.name);
    if (entry.isDirectory) {
      const remaining = await cleanSubdirectory(fs, entryPath, expectedPaths);
      if (remaining === 0) {
        await fs.rm(entryPath, { recursive: true, force: true });
      }
    } else if (entry.isFile && entry.name.endsWith('.html') && !expectedPaths.has(entryPath)) {
      await fs.unlink(entryPath);
    }
  }
}

async function cleanSubdirectory(
  fs: FileSystemPort,
  dirPath: string,
  expectedPaths: ReadonlySet<string>,
): Promise<number> {
  const entries = await fs.readdir(dirPath);
  let remaining = 0;

  for (const entry of entries) {
    const entryPath = join(dirPath, entry.name);
    if (entry.isDirectory) {
      const nestedRemaining = await cleanSubdirectory(fs, entryPath, expectedPaths);
      if (nestedRemaining === 0) {
        await fs.rm(entryPath, { recursive: true, force: true });
      } else {
        remaining += nestedRemaining;
      }
    } else if (entry.isFile && entry.name.endsWith('.html')) {
      if (expectedPaths.has(entryPath)) {
        remaining += 1;
      } else {
        await fs.unlink(entryPath);
      }
    } else {
      remaining += 1;
    }
  }

  return remaining;
}

function buildPrerenderRoutes(urlEntries: readonly StaticUrlEntry[]): string[] {
  const routes = new Set<string>(['/']);
  for (const entry of urlEntries) {
    const cleanLang = entry.lang.replace(/^\/+|\/+$/g, '').trim();
    if (cleanLang.length === 0) {
      continue;
    }
    const cleanUrl = entry.url.replace(/^\/+|\/+$/g, '').trim();
    routes.add(cleanUrl.length === 0 ? `/${cleanLang}` : `/${cleanLang}/${cleanUrl}`);
  }
  return [...routes].sort();
}

function readString(row: Record<string, unknown>, key: string, fallbackKey?: string): string {
  const value = key in row ? row[key] : fallbackKey ? row[fallbackKey] : undefined;
  return typeof value === 'string' ? value : '';
}

function readNumber(row: Record<string, unknown>, key: string, fallbackKey?: string): number {
  const value = key in row ? row[key] : fallbackKey ? row[fallbackKey] : undefined;
  return typeof value === 'number' ? value : 0;
}

function toStaticUrlEntry(row: Record<string, unknown>): StaticUrlEntry {
  return {
    id: readString(row, 'id'),
    url: readString(row, 'url'),
    lang: readString(row, 'lang'),
    pageId: readString(row, 'pageId', 'page_id'),
  };
}

function toStaticMediaEntry(row: Record<string, unknown>): StaticMediaEntry {
  return {
    id: readString(row, 'id'),
    filename: readString(row, 'filename'),
    url: readString(row, 'url'),
    mimeType: readString(row, 'mimeType', 'mime_type'),
    sizeBytes: readNumber(row, 'sizeBytes', 'size_bytes'),
  };
}
