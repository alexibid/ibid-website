import { vi } from 'vitest';
import { isRecord } from '../common/type-guards.util';
import { ConfigService } from '../config/config.service';
import { createMockDrizzleDb } from '../mocks/drizzle-db.mock';
import { createMockFileSystem } from '../mocks/file-system.mock';
import { PORTFOLIO_CONTENT_FIXTURES } from '../mocks/portfolio-content.mock';
import { CONFIG_MOCK_ENVS } from '../mocks/static-export-fixtures.mock';
import { StaticExportService } from '../static-export/static-export.service';
import { hasEncodingArtifacts } from './content-encoding.util';
import { EXIT_SLUGS_BY_LANG, type SupportedLang } from './content/portfolio-content.types';
import { PortfolioContentService } from './portfolio-content.service';

interface StaticRoutesManifest {
  readonly pages: ReadonlyArray<{
    readonly id: string;
    readonly title: string;
    readonly type: string;
    readonly lang: string;
    readonly location?: string;
    readonly metadata?: Record<string, unknown>;
  }>;
  readonly urls: ReadonlyArray<{ readonly url: string; readonly lang: string; readonly pageId: string }>;
  readonly media: ReadonlyArray<Record<string, unknown>>;
}

async function runValidation(
  service: PortfolioContentService,
  entries: typeof PORTFOLIO_CONTENT_FIXTURES.validEntries
): Promise<void> {
  await Promise.resolve(service.validateEntries(entries));
}

function readLocation(row: Record<string, unknown>): unknown {
  const metadata = row['metadata'];
  return isRecord(metadata) ? metadata['location'] : undefined;
}

function parseStaticRoutesManifest(raw: string | Buffer | undefined): StaticRoutesManifest {
  const parsed: unknown = JSON.parse(String(raw));
  if (!isRecord(parsed)) throw new Error('Expected routes.json object');
  const rawPages = parsed['pages'];
  const rawUrls = parsed['urls'];
  const rawMedia = parsed['media'];
  if (!Array.isArray(rawPages) || !Array.isArray(rawUrls) || !Array.isArray(rawMedia)) {
    throw new Error('Expected pages, urls, and media arrays in routes.json');
  }
  return {
    pages: rawPages.filter(isRecord).map((page) => ({
      id: typeof page['id'] === 'string' ? page['id'] : '',
      title: typeof page['title'] === 'string' ? page['title'] : '',
      type: typeof page['type'] === 'string' ? page['type'] : '',
      lang: typeof page['lang'] === 'string' ? page['lang'] : '',
      ...(typeof page['location'] === 'string' ? { location: page['location'] } : {}),
      ...(isRecord(page['metadata']) ? { metadata: page['metadata'] } : {}),
    })),
    urls: rawUrls.filter(isRecord).map((entry) => ({
      url: typeof entry['url'] === 'string' ? entry['url'] : '',
      lang: typeof entry['lang'] === 'string' ? entry['lang'] : '',
      pageId: typeof entry['pageId'] === 'string' ? entry['pageId'] : '',
    })),
    media: rawMedia.filter(isRecord),
  };
}

describe('PortfolioContentService', () => {
  it('should fix all encoding issues directly in database records so stored content is clean UTF-8 HTML', async () => {
    const config = new ConfigService(CONFIG_MOCK_ENVS.configured);
    const db = createMockDrizzleDb();
    db.seedTableRows('pages', PORTFOLIO_CONTENT_FIXTURES.dirtyDbPages);
    const fs = createMockFileSystem();
    const service = new PortfolioContentService({ db, fs, config });

    await service.repairExistingEncoding();

    const rows = db.getTableRows('pages');
    expect(rows).toHaveLength(PORTFOLIO_CONTENT_FIXTURES.dirtyDbPages.length);
    for (const row of rows) {
      expect(hasEncodingArtifacts(String(row['content']))).toBe(false);
      expect(hasEncodingArtifacts(String(row['title']))).toBe(false);
    }
    const cover = rows.find((row) => row['id'] === 'dirty-pt-cover');
    expect(String(cover?.['content'])).toContain('Estratégia e "Design"');
    expect(String(cover?.['content'])).toContain('Habitação');
    const chapterOne = rows.find((row) => row['id'] === 'dirty-pt-ch1');
    expect(String(chapterOne?.['content'])).toContain('<img src="https://images.unsplash.com/');
  });

  it('should repair encoding against an explicit database client argument without mutating the injected default database', async () => {
    const config = new ConfigService(CONFIG_MOCK_ENVS.configured);
    const primaryDb = createMockDrizzleDb();
    const explicitDb = createMockDrizzleDb();
    primaryDb.seedTableRows('pages', PORTFOLIO_CONTENT_FIXTURES.dirtyDbPages);
    explicitDb.seedTableRows('pages', PORTFOLIO_CONTENT_FIXTURES.dirtyDbPages);
    const fs = createMockFileSystem();
    const service = new PortfolioContentService({ db: primaryDb, fs, config });

    await service.repairExistingEncoding(explicitDb);

    for (const row of explicitDb.getTableRows('pages')) {
      expect(hasEncodingArtifacts(String(row['content']))).toBe(false);
    }
    const primaryDirtyRow = primaryDb
      .getTableRows('pages')
      .find((row) => row['id'] === 'dirty-pt-cover');
    expect(hasEncodingArtifacts(String(primaryDirtyRow?.['content']))).toBe(true);
  });

  it('should handle empty pages table cleanly and propagate database failures in repairExistingEncoding', async () => {
    const config = new ConfigService(CONFIG_MOCK_ENVS.configured);
    const db = createMockDrizzleDb();
    const fs = createMockFileSystem();
    const service = new PortfolioContentService({ db, fs, config });

    await service.repairExistingEncoding();
    expect(db.getTableRows('pages')).toHaveLength(0);

    db.setShouldFail(true);
    await expect(service.repairExistingEncoding()).rejects.toThrow();
  });

  it('should reject invalid datasets including missing languages, missing Solum, client names, emails, encoding artifacts, broken image slots, and invalid routes', async () => {
    const config = new ConfigService(CONFIG_MOCK_ENVS.configured);
    const db = createMockDrizzleDb();
    const fs = createMockFileSystem();
    const service = new PortfolioContentService({ db, fs, config });

    const invalidCases = [
      [],
      PORTFOLIO_CONTENT_FIXTURES.invalidMissingLanguage,
      PORTFOLIO_CONTENT_FIXTURES.invalidMissingSolum,
      PORTFOLIO_CONTENT_FIXTURES.invalidClientName,
      PORTFOLIO_CONTENT_FIXTURES.invalidBrokenImageSlot,
      PORTFOLIO_CONTENT_FIXTURES.invalidDraftMarker,
      PORTFOLIO_CONTENT_FIXTURES.invalidEmailLeak,
      PORTFOLIO_CONTENT_FIXTURES.invalidEncodingArtifact,
      PORTFOLIO_CONTENT_FIXTURES.invalidFrontCoverSlug,
      PORTFOLIO_CONTENT_FIXTURES.invalidPtExitSlug,
      PORTFOLIO_CONTENT_FIXTURES.invalidExitOrder
    ];

    for (const invalidDataset of invalidCases) {
      await expect(runValidation(service, invalidDataset)).rejects.toThrow();
    }
  });

  it('should populate database with all 85 entries, preserve media, and run StaticExportService.exportAll when exportStatic is true', async () => {
    const config = new ConfigService(CONFIG_MOCK_ENVS.configured);
    const db = createMockDrizzleDb();
    db.seedTableRows('pages', PORTFOLIO_CONTENT_FIXTURES.dirtyDbPages);
    db.seedTableRows('media', PORTFOLIO_CONTENT_FIXTURES.preservedMediaRows);
    const fs = createMockFileSystem(PORTFOLIO_CONTENT_FIXTURES.validContentFiles);
    const staticExport = new StaticExportService(db, fs, config);
    const exportSpy = vi.spyOn(staticExport, 'exportAll');
    const service = new PortfolioContentService({ db, fs, config, staticExport });

    const result = await service.syncAll({
      contentDir: PORTFOLIO_CONTENT_FIXTURES.contentDir,
      exportStatic: true
    });

    expect(result.staticExported).toBe(true);
    expect(exportSpy).toHaveBeenCalledTimes(1);

    const pages = db.getTableRows('pages');
    const urls = db.getTableRows('urls');
    const media = db.getTableRows('media');

    expect(pages).toHaveLength(85);
    expect(urls).toHaveLength(85);
    expect(media).toHaveLength(PORTFOLIO_CONTENT_FIXTURES.preservedMediaRows.length);

    const manifest = parseStaticRoutesManifest(fs.getFile(`${config.staticPagesDir}/routes.json`));
    expect(manifest.pages).toHaveLength(85);
    expect(manifest.urls).toHaveLength(85);
    expect(manifest.media).toEqual(PORTFOLIO_CONTENT_FIXTURES.preservedMediaRows);

    const manifestPagesById = new Map(manifest.pages.map((page) => [page.id, page]));
    for (const dbPage of pages) {
      const id = String(dbPage['id']);
      const lang = String(dbPage['lang']);
      const meta = manifestPagesById.get(id);
      expect(meta).toBeDefined();
      expect(meta).not.toHaveProperty('content');
      expect(meta?.title).toBe(dbPage['title']);
      expect(meta?.metadata?.['location']).toBe(readLocation(dbPage));

      const staticHtml = String(fs.getFile(`${config.staticPagesDir}/${lang}/${id}.html`));
      expect(hasEncodingArtifacts(staticHtml)).toBe(false);
      expect(staticHtml.startsWith('"')).toBe(false);
      expect(staticHtml).toBe(dbPage['content']);
    }

    for (const lang of PORTFOLIO_CONTENT_FIXTURES.languages) {
      const typedLang: SupportedLang = lang;
      const frontCover = manifest.pages.find(
        (page) => page.lang === lang && page.metadata?.['location'] === 'front-cover'
      );
      expect(frontCover).toBeDefined();
      expect(manifest.urls.find((u) => u.pageId === frontCover?.id)?.url).toBe('');

      const exitPages = manifest.pages.filter((page) => page.lang === lang && page.type === 'exit');
      expect(exitPages).toHaveLength(3);
      for (const exitPage of exitPages) {
        expect(manifest.urls.find((u) => u.pageId === exitPage.id)?.url).toBe(
          EXIT_SLUGS_BY_LANG[typedLang]
        );
      }
    }
    expect(fs.getFile(config.prerenderRoutesPath)).toBeDefined();
  });

  it('should export clean UTF-8 HTML verbatim via StaticExportService without double-encoding after repairExistingEncoding', async () => {
    const config = new ConfigService(CONFIG_MOCK_ENVS.configured);
    const db = createMockDrizzleDb();
    db.seedTableRows('pages', PORTFOLIO_CONTENT_FIXTURES.dirtyDbPages);
    const fs = createMockFileSystem();
    const staticExport = new StaticExportService(db, fs, config);
    const service = new PortfolioContentService({ db, fs, config, staticExport });

    await service.repairExistingEncoding();
    await staticExport.exportAll();
    const repairedDbPages = db.getTableRows('pages');

    for (const dbPage of repairedDbPages) {
      const htmlPath = `${config.staticPagesDir}/${String(dbPage['lang'])}/${String(dbPage['id'])}.html`;
      const exportedHtml = String(fs.getFile(htmlPath));
      expect(exportedHtml).toBe(dbPage['content']);
      expect(hasEncodingArtifacts(exportedHtml)).toBe(false);
      expect(exportedHtml.startsWith('"')).toBe(false);
    }
  });

  it('should support syncAll with exportStatic false without requiring StaticExportService', async () => {
    const config = new ConfigService(CONFIG_MOCK_ENVS.configured);
    const db = createMockDrizzleDb();
    const fs = createMockFileSystem(PORTFOLIO_CONTENT_FIXTURES.validContentFiles);
    const service = new PortfolioContentService({ db, fs, config });

    const result = await service.syncAll({
      contentDir: PORTFOLIO_CONTENT_FIXTURES.contentDir,
      exportStatic: false
    });

    expect(result.staticExported).toBe(false);
    expect(db.getTableRows('pages')).toHaveLength(85);
    expect(db.getTableRows('urls')).toHaveLength(85);
    expect(fs.writeFileAtomic).not.toHaveBeenCalled();
  });

  it('should fail syncAll without mutating database or exporting static pages when content files are missing or database writes fail', async () => {
    const config = new ConfigService(CONFIG_MOCK_ENVS.configured);
    const db = createMockDrizzleDb();
    db.seedTableRows('pages', PORTFOLIO_CONTENT_FIXTURES.dirtyDbPages);
    const incompleteFiles = { ...PORTFOLIO_CONTENT_FIXTURES.validContentFiles };
    delete incompleteFiles[`${PORTFOLIO_CONTENT_FIXTURES.contentDir}/de.json`];
    const fs = createMockFileSystem(incompleteFiles);
    const staticExport = new StaticExportService(db, fs, config);
    const exportSpy = vi.spyOn(staticExport, 'exportAll');
    const service = new PortfolioContentService({ db, fs, config, staticExport });

    await expect(
      service.syncAll({
        contentDir: PORTFOLIO_CONTENT_FIXTURES.contentDir,
        exportStatic: true
      })
    ).rejects.toThrow();
    expect(db.getTableRows('pages')).toHaveLength(PORTFOLIO_CONTENT_FIXTURES.dirtyDbPages.length);
    expect(exportSpy).not.toHaveBeenCalled();

    fs.seedFile(
      `${PORTFOLIO_CONTENT_FIXTURES.contentDir}/de.json`,
      PORTFOLIO_CONTENT_FIXTURES.validContentFiles[`${PORTFOLIO_CONTENT_FIXTURES.contentDir}/de.json`]
    );
    db.setShouldFail(true);

    await expect(
      service.syncAll({
        contentDir: PORTFOLIO_CONTENT_FIXTURES.contentDir,
        exportStatic: true
      })
    ).rejects.toThrow();
    db.setShouldFail(false);
    expect(db.getTableRows('pages')).toHaveLength(PORTFOLIO_CONTENT_FIXTURES.dirtyDbPages.length);
    expect(exportSpy).not.toHaveBeenCalled();
  });
});
