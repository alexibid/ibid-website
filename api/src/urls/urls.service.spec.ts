import { NotFoundException } from '@nestjs/common';
import { vi } from 'vitest';
import { isRecord } from '../common/type-guards.util';
import { ConfigService } from '../config/config.service';
import { createMockDrizzleDb } from '../mocks/drizzle-db.mock';
import { createMockFileSystem } from '../mocks/file-system.mock';
import { CONFIG_MOCK_ENVS, URL_MOCK_FIXTURES } from '../mocks/static-export-fixtures.mock';
import { StaticExportService } from '../static-export/static-export.service';
import { UrlsService } from './urls.service';

function readExpandedPage(entry: unknown): Record<string, unknown> | null | undefined {
  if (!isRecord(entry) || !('page' in entry)) {
    return undefined;
  }
  const page = entry['page'];
  if (page === null) {
    return null;
  }
  return isRecord(page) ? page : undefined;
}

describe('UrlsService', () => {
  it('should list all urls and filter by language without expanding pages by default', async () => {
    const config = new ConfigService(CONFIG_MOCK_ENVS.configured);
    const db = createMockDrizzleDb();
    db.seedTableRows('urls', URL_MOCK_FIXTURES.existingUrls);
    const fs = createMockFileSystem();
    const service = new UrlsService(db, new StaticExportService(db, fs, config));

    const allUrls = await service.findAll();
    const ptUrls = await service.findAll(URL_MOCK_FIXTURES.filterPt);

    expect(allUrls).toHaveLength(URL_MOCK_FIXTURES.existingUrls.length);
    expect(ptUrls).toHaveLength(2);
    expect(ptUrls.every((entry) => entry.lang === 'pt')).toBe(true);
    expect(allUrls.every((entry) => !('page' in entry))).toBe(true);
  });

  it('should expand page metadata without content via a single leftJoin when expandPage is true', async () => {
    const config = new ConfigService(CONFIG_MOCK_ENVS.configured);
    const db = createMockDrizzleDb();
    db.seedTableRows('pages', URL_MOCK_FIXTURES.existingPages);
    db.seedTableRows('urls', URL_MOCK_FIXTURES.existingUrls);
    const fs = createMockFileSystem();
    const service = new UrlsService(db, new StaticExportService(db, fs, config));

    const expanded = await service.findAll(URL_MOCK_FIXTURES.expandedOnly);

    expect(db.select).toHaveBeenCalledTimes(1);
    expect(expanded).toHaveLength(URL_MOCK_FIXTURES.existingUrls.length);
    for (const entry of expanded) {
      const page = readExpandedPage(entry);
      expect(page).toBeDefined();
      expect(page).not.toBeNull();
      expect(page).not.toHaveProperty('content');
      expect(typeof page?.['id']).toBe('string');
      expect(typeof page?.['title']).toBe('string');
      expect(typeof page?.['type']).toBe('string');
      expect(typeof page?.['lang']).toBe('string');
    }

    db.select.mockClear();
    const ptExpanded = await service.findAll(URL_MOCK_FIXTURES.filterPtExpanded);
    expect(db.select).toHaveBeenCalledTimes(1);
    expect(ptExpanded).toHaveLength(2);
    expect(ptExpanded.every((entry) => entry.lang === 'pt')).toBe(true);
  });

  it('should return null page metadata for orphaned urls when expandPage is true and return plain urls when expandPage is false', async () => {
    const config = new ConfigService(CONFIG_MOCK_ENVS.configured);
    const db = createMockDrizzleDb();
    db.seedTableRows('pages', URL_MOCK_FIXTURES.existingPages);
    db.seedTableRows('urls', URL_MOCK_FIXTURES.orphanExistingUrls);
    const fs = createMockFileSystem();
    const service = new UrlsService(db, new StaticExportService(db, fs, config));

    const expanded = await service.findAll(URL_MOCK_FIXTURES.expandedOnly);
    const orphanEntry = expanded.find((item) => item.id === 'url-orphan');
    expect(readExpandedPage(orphanEntry)).toBeNull();

    const plain = await service.findAll(URL_MOCK_FIXTURES.nonExpanded);
    expect(plain.every((entry) => !('page' in entry))).toBe(true);
  });

  it('should create a url mapping in PostgreSQL and run StaticExportService.exportAll', async () => {
    const config = new ConfigService(CONFIG_MOCK_ENVS.configured);
    const db = createMockDrizzleDb();
    db.seedTableRows('pages', URL_MOCK_FIXTURES.existingPages);
    const fs = createMockFileSystem();
    const staticExport = new StaticExportService(db, fs, config);
    const exportSpy = vi.spyOn(staticExport, 'exportAll');
    const service = new UrlsService(db, staticExport);

    const created = await service.create(URL_MOCK_FIXTURES.createPayload);

    expect(created.url).toBe(URL_MOCK_FIXTURES.createPayload.url);
    expect(created.pageId).toBe(URL_MOCK_FIXTURES.createPayload.pageId);
    expect(db.getTableRows('urls')).toHaveLength(1);
    expect(exportSpy).toHaveBeenCalledTimes(1);
    expect(fs.getFile(config.prerenderRoutesPath)).toBeDefined();
  });

  it('should allow an empty string url for root language home pages and run exportAll', async () => {
    const config = new ConfigService(CONFIG_MOCK_ENVS.configured);
    const db = createMockDrizzleDb();
    db.seedTableRows('pages', URL_MOCK_FIXTURES.existingPages);
    const fs = createMockFileSystem();
    const staticExport = new StaticExportService(db, fs, config);
    const exportSpy = vi.spyOn(staticExport, 'exportAll');
    const service = new UrlsService(db, staticExport);

    const created = await service.create(URL_MOCK_FIXTURES.rootUrlPayload);

    expect(created.url).toBe('');
    expect(exportSpy).toHaveBeenCalledTimes(1);
  });

  it('should update an existing url in PostgreSQL and run StaticExportService.exportAll', async () => {
    const config = new ConfigService(CONFIG_MOCK_ENVS.configured);
    const db = createMockDrizzleDb();
    db.seedTableRows('pages', URL_MOCK_FIXTURES.existingPages);
    db.seedTableRows('urls', URL_MOCK_FIXTURES.existingUrls);
    const fs = createMockFileSystem();
    const staticExport = new StaticExportService(db, fs, config);
    const exportSpy = vi.spyOn(staticExport, 'exportAll');
    const service = new UrlsService(db, staticExport);

    const updated = await service.update(
      URL_MOCK_FIXTURES.targetUrlId,
      URL_MOCK_FIXTURES.updatePayload
    );

    expect(updated.url).toBe(URL_MOCK_FIXTURES.updatePayload.url);
    expect(exportSpy).toHaveBeenCalledTimes(1);
  });

  it('should delete an existing url from PostgreSQL and run StaticExportService.exportAll', async () => {
    const config = new ConfigService(CONFIG_MOCK_ENVS.configured);
    const db = createMockDrizzleDb();
    db.seedTableRows('urls', URL_MOCK_FIXTURES.existingUrls);
    const fs = createMockFileSystem();
    const staticExport = new StaticExportService(db, fs, config);
    const exportSpy = vi.spyOn(staticExport, 'exportAll');
    const service = new UrlsService(db, staticExport);

    await service.remove(URL_MOCK_FIXTURES.targetUrlId);

    expect(db.getTableRows('urls')).toHaveLength(URL_MOCK_FIXTURES.existingUrls.length - 1);
    expect(exportSpy).toHaveBeenCalledTimes(1);
  });

  it('should reject creating a url referencing a missing page without mutating database or running exportAll', async () => {
    const config = new ConfigService(CONFIG_MOCK_ENVS.configured);
    const db = createMockDrizzleDb();
    db.seedTableRows('pages', URL_MOCK_FIXTURES.existingPages);
    const fs = createMockFileSystem();
    const staticExport = new StaticExportService(db, fs, config);
    const exportSpy = vi.spyOn(staticExport, 'exportAll');
    const service = new UrlsService(db, staticExport);

    await expect(service.create(URL_MOCK_FIXTURES.orphanPayload)).rejects.toThrow(NotFoundException);
    expect(db.getTableRows('urls')).toHaveLength(0);
    expect(exportSpy).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException when updating or deleting a missing url without calling exportAll', async () => {
    const config = new ConfigService(CONFIG_MOCK_ENVS.configured);
    const db = createMockDrizzleDb();
    const fs = createMockFileSystem();
    const staticExport = new StaticExportService(db, fs, config);
    const exportSpy = vi.spyOn(staticExport, 'exportAll');
    const service = new UrlsService(db, staticExport);

    await expect(
      service.update(URL_MOCK_FIXTURES.missingUrlId, URL_MOCK_FIXTURES.updatePayload)
    ).rejects.toThrow(NotFoundException);
    await expect(service.remove(URL_MOCK_FIXTURES.missingUrlId)).rejects.toThrow(NotFoundException);
    expect(exportSpy).not.toHaveBeenCalled();
  });
});
