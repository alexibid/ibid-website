import { isRecord } from '../common/type-guards.util';
import { ConfigService } from '../config/config.service';
import { createMockDrizzleDb } from '../mocks/drizzle-db.mock';
import { createMockFileSystem } from '../mocks/file-system.mock';
import { CONFIG_MOCK_ENVS, STATIC_EXPORT_FIXTURES } from '../mocks/static-export-fixtures.mock';
import { StaticExportService } from './static-export.service';

interface ParsedRoutesManifest {
  readonly pages: Record<string, unknown>[];
  readonly urls: Record<string, unknown>[];
  readonly media: Record<string, unknown>[];
}

function toRecordList(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    throw new Error('Expected array field in routes.json');
  }
  return value.filter(isRecord);
}

function parseRoutesManifest(raw: string | Buffer | undefined): ParsedRoutesManifest {
  const parsed: unknown = JSON.parse(String(raw));
  if (!isRecord(parsed)) {
    throw new Error('Expected routes.json to be an object');
  }
  return {
    pages: toRecordList(parsed['pages']),
    urls: toRecordList(parsed['urls']),
    media: toRecordList(parsed['media']),
  };
}

describe('StaticExportService', () => {
  it('should write sanitized HTML files to staticPagesDir/lang/pageId.html for every page', async () => {
    const config = new ConfigService(CONFIG_MOCK_ENVS.configured);
    const db = createMockDrizzleDb();
    db.seedTableRows('pages', STATIC_EXPORT_FIXTURES.pages);
    db.seedTableRows('urls', STATIC_EXPORT_FIXTURES.urls);
    db.seedTableRows('media', STATIC_EXPORT_FIXTURES.media);
    const fs = createMockFileSystem();
    const service = new StaticExportService(db, fs, config);

    await service.exportAll();

    const homePtHtml = String(fs.getFile(`${config.staticPagesDir}/pt/home-pt-1.html`));
    expect(homePtHtml).toContain('<p>Capa</p>');
    expect(homePtHtml.toLowerCase()).not.toContain('<script');
    expect(homePtHtml).not.toContain('alert(1)');

    const chapterPtHtml = String(fs.getFile(`${config.staticPagesDir}/pt/chapter-pt-1.html`));
    expect(chapterPtHtml).toContain('<div class="project-card"><p>Texto PT</p></div>');

    for (const page of STATIC_EXPORT_FIXTURES.pages) {
      const filePath = `${config.staticPagesDir}/${page.lang}/${page.id}.html`;
      expect(fs.getFile(filePath)).toBeDefined();
    }
  });

  it('should delete orphaned html files and empty subdirectories without ever deleting routes.json', async () => {
    const config = new ConfigService(CONFIG_MOCK_ENVS.configured);
    const db = createMockDrizzleDb();
    db.seedTableRows('pages', STATIC_EXPORT_FIXTURES.pages);
    db.seedTableRows('urls', STATIC_EXPORT_FIXTURES.urls);
    db.seedTableRows('media', STATIC_EXPORT_FIXTURES.media);
    const fs = createMockFileSystem(STATIC_EXPORT_FIXTURES.orphanedFiles);
    const service = new StaticExportService(db, fs, config);

    await service.exportAll();

    const stalePtFile = `${config.staticPagesDir}/pt/stale-old-page.html`;
    const staleOldLangFile = `${config.staticPagesDir}/old-lang/orphan.html`;
    const routesJsonPath = `${config.staticPagesDir}/routes.json`;

    expect(fs.getFile(stalePtFile)).toBeUndefined();
    expect(fs.getFile(staleOldLangFile)).toBeUndefined();
    expect(fs.hasDirectory(`${config.staticPagesDir}/old-lang`)).toBe(false);
    expect(fs.getFile(routesJsonPath)).toBeDefined();
    expect(fs.getDeletedPaths()).not.toContain(routesJsonPath);
    expect(fs.getRemovedPaths()).not.toContain(routesJsonPath);
  });

  it('should write metadata-only routes.json with zero content fields', async () => {
    const config = new ConfigService(CONFIG_MOCK_ENVS.configured);
    const db = createMockDrizzleDb();
    db.seedTableRows('pages', STATIC_EXPORT_FIXTURES.pages);
    db.seedTableRows('urls', STATIC_EXPORT_FIXTURES.urls);
    db.seedTableRows('media', STATIC_EXPORT_FIXTURES.media);
    const fs = createMockFileSystem();
    const service = new StaticExportService(db, fs, config);

    await service.exportAll();

    const routesJsonPath = `${config.staticPagesDir}/routes.json`;
    expect(fs.writeFileAtomic).toHaveBeenCalledWith(routesJsonPath, expect.any(String));

    const parsed = parseRoutesManifest(fs.getFile(routesJsonPath));

    expect(parsed.pages).toHaveLength(STATIC_EXPORT_FIXTURES.pages.length);
    expect(parsed.urls).toHaveLength(STATIC_EXPORT_FIXTURES.urls.length);
    expect(parsed.media).toHaveLength(STATIC_EXPORT_FIXTURES.media.length);
    for (const pageMeta of parsed.pages) {
      expect(pageMeta).not.toHaveProperty('content');
      expect(typeof pageMeta['id']).toBe('string');
      expect(typeof pageMeta['title']).toBe('string');
      expect(typeof pageMeta['type']).toBe('string');
      expect(typeof pageMeta['lang']).toBe('string');
    }
  });

  it('should regenerate prerender-routes.txt atomically from url mappings', async () => {
    const config = new ConfigService(CONFIG_MOCK_ENVS.configured);
    const db = createMockDrizzleDb();
    db.seedTableRows('pages', STATIC_EXPORT_FIXTURES.pages);
    db.seedTableRows('urls', STATIC_EXPORT_FIXTURES.urls);
    db.seedTableRows('media', STATIC_EXPORT_FIXTURES.media);
    const fs = createMockFileSystem();
    const service = new StaticExportService(db, fs, config);

    await service.exportAll();

    expect(fs.writeFileAtomic).toHaveBeenCalledWith(config.prerenderRoutesPath, expect.any(String));
    const lines = String(fs.getFile(config.prerenderRoutesPath))
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    for (const expectedRoute of STATIC_EXPORT_FIXTURES.expectedPrerenderRoutes) {
      expect(lines).toContain(expectedRoute);
    }
  });

  it('should reject path traversal in page lang or id before writing any files', async () => {
    const config = new ConfigService(CONFIG_MOCK_ENVS.configured);

    for (const badPage of [
      STATIC_EXPORT_FIXTURES.traversalPages.badLang,
      STATIC_EXPORT_FIXTURES.traversalPages.badId
    ]) {
      const db = createMockDrizzleDb();
      db.seedTableRows('pages', [badPage]);
      const fs = createMockFileSystem(STATIC_EXPORT_FIXTURES.orphanedFiles);
      const service = new StaticExportService(db, fs, config);

      await expect(service.exportAll()).rejects.toThrow();
      expect(fs.writeFileAtomic).not.toHaveBeenCalled();
      expect(fs.writeFile).not.toHaveBeenCalled();
      expect(fs.unlink).not.toHaveBeenCalled();
      expect(fs.rm).not.toHaveBeenCalled();
    }
  });

  it('should export empty manifests cleanly when database tables have no rows', async () => {
    const config = new ConfigService(CONFIG_MOCK_ENVS.configured);
    const db = createMockDrizzleDb();
    const fs = createMockFileSystem(STATIC_EXPORT_FIXTURES.orphanedFiles);
    const service = new StaticExportService(db, fs, config);

    await service.exportAll();

    const parsed = parseRoutesManifest(fs.getFile(`${config.staticPagesDir}/routes.json`));
    expect(parsed.pages).toEqual([]);
    expect(parsed.urls).toEqual([]);
    expect(parsed.media).toEqual([]);
    expect(fs.getFile(`${config.staticPagesDir}/pt/stale-old-page.html`)).toBeUndefined();
    expect(fs.writeFileAtomic).toHaveBeenCalledWith(config.prerenderRoutesPath, expect.any(String));
  });

  it('should fail without writing files when database queries fail and propagate file write errors', async () => {
    const config = new ConfigService(CONFIG_MOCK_ENVS.configured);
    const db = createMockDrizzleDb();
    db.setShouldFail(true);
    const fs = createMockFileSystem();
    const service = new StaticExportService(db, fs, config);

    await expect(service.exportAll()).rejects.toThrow();
    expect(fs.writeFileAtomic).not.toHaveBeenCalled();

    db.setShouldFail(false);
    fs.setShouldFailWrite(true);
    await expect(service.exportAll()).rejects.toThrow();
  });
});
