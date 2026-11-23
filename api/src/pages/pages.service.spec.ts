import { NotFoundException } from '@nestjs/common';
import { vi } from 'vitest';
import { isRecord } from '../common/type-guards.util';
import { ConfigService } from '../config/config.service';
import { createMockDrizzleDb } from '../mocks/drizzle-db.mock';
import { createMockFileSystem } from '../mocks/file-system.mock';
import { CONFIG_MOCK_ENVS, PAGE_MOCK_FIXTURES } from '../mocks/static-export-fixtures.mock';
import { StaticExportService } from '../static-export/static-export.service';
import { PagesService } from './pages.service';

interface ParsedManifestPage {
  readonly id: string;
  readonly title: string;
}

function parseManifestPages(raw: string | Buffer | undefined): ParsedManifestPage[] {
  const parsed: unknown = JSON.parse(String(raw));
  if (!isRecord(parsed) || !Array.isArray(parsed['pages'])) {
    throw new Error('Expected pages array in routes.json');
  }
  return parsed['pages'].filter(isRecord).map((page) => ({
    id: typeof page['id'] === 'string' ? page['id'] : '',
    title: typeof page['title'] === 'string' ? page['title'] : '',
  }));
}

describe('PagesService', () => {
  it('should list all pages and filter by type and language', async () => {
    const config = new ConfigService(CONFIG_MOCK_ENVS.configured);
    const db = createMockDrizzleDb();
    db.seedTableRows('pages', PAGE_MOCK_FIXTURES.existingPages);
    const fs = createMockFileSystem();
    const service = new PagesService(db, new StaticExportService(db, fs, config));

    const allPages = await service.findAll();
    const filteredPages = await service.findAll(PAGE_MOCK_FIXTURES.filterPtHome);

    expect(allPages).toHaveLength(PAGE_MOCK_FIXTURES.existingPages.length);
    expect(filteredPages).toHaveLength(2);
    expect(filteredPages.every((page) => page.type === 'home' && page.lang === 'pt')).toBe(true);
  });

  it('should return an empty array when no pages exist', async () => {
    const config = new ConfigService(CONFIG_MOCK_ENVS.configured);
    const db = createMockDrizzleDb();
    const fs = createMockFileSystem();
    const service = new PagesService(db, new StaticExportService(db, fs, config));

    await expect(service.findAll()).resolves.toEqual([]);
  });

  it('should create a page in PostgreSQL and run StaticExportService.exportAll', async () => {
    const config = new ConfigService(CONFIG_MOCK_ENVS.configured);
    const db = createMockDrizzleDb();
    const fs = createMockFileSystem();
    const staticExport = new StaticExportService(db, fs, config);
    const exportSpy = vi.spyOn(staticExport, 'exportAll');
    const service = new PagesService(db, staticExport);

    const created = await service.create(PAGE_MOCK_FIXTURES.createPayload);

    expect(created.id).toBeTruthy();
    expect(created.title).toBe(PAGE_MOCK_FIXTURES.createPayload.title);
    expect(db.getTableRows('pages')).toHaveLength(1);
    expect(exportSpy).toHaveBeenCalledTimes(1);
    expect(fs.getFile(`${config.staticPagesDir}/${created.lang}/${created.id}.html`)).toBeDefined();

    const routesPages = parseManifestPages(fs.getFile(`${config.staticPagesDir}/routes.json`));
    expect(routesPages.some((p) => p.title === PAGE_MOCK_FIXTURES.createPayload.title)).toBe(true);
  });

  it('should update an existing page in PostgreSQL and run StaticExportService.exportAll', async () => {
    const config = new ConfigService(CONFIG_MOCK_ENVS.configured);
    const db = createMockDrizzleDb();
    db.seedTableRows('pages', PAGE_MOCK_FIXTURES.existingPages);
    const fs = createMockFileSystem();
    const staticExport = new StaticExportService(db, fs, config);
    const exportSpy = vi.spyOn(staticExport, 'exportAll');
    const service = new PagesService(db, staticExport);

    const updated = await service.update(
      PAGE_MOCK_FIXTURES.targetPageId,
      PAGE_MOCK_FIXTURES.updatePayload
    );

    expect(updated.title).toBe(PAGE_MOCK_FIXTURES.updatePayload.title);
    expect(exportSpy).toHaveBeenCalledTimes(1);
    expect(
      String(fs.getFile(`${config.staticPagesDir}/${updated.lang}/${updated.id}.html`))
    ).toContain(PAGE_MOCK_FIXTURES.updatePayload.content);

    const routesPages = parseManifestPages(fs.getFile(`${config.staticPagesDir}/routes.json`));
    const found = routesPages.find((p) => p.id === PAGE_MOCK_FIXTURES.targetPageId);
    expect(found?.title).toBe(PAGE_MOCK_FIXTURES.updatePayload.title);
  });

  it('should delete an existing page from PostgreSQL and run StaticExportService.exportAll', async () => {
    const config = new ConfigService(CONFIG_MOCK_ENVS.configured);
    const db = createMockDrizzleDb();
    db.seedTableRows('pages', PAGE_MOCK_FIXTURES.existingPages);
    const fs = createMockFileSystem();
    const staticExport = new StaticExportService(db, fs, config);
    const exportSpy = vi.spyOn(staticExport, 'exportAll');
    const service = new PagesService(db, staticExport);

    await service.remove(PAGE_MOCK_FIXTURES.targetPageId);

    expect(db.getTableRows('pages')).toHaveLength(PAGE_MOCK_FIXTURES.existingPages.length - 1);
    expect(exportSpy).toHaveBeenCalledTimes(1);
    expect(fs.getFile(`${config.staticPagesDir}/pt/${PAGE_MOCK_FIXTURES.targetPageId}.html`)).toBeUndefined();
  });

  it('should throw NotFoundException when fetching, updating, or deleting a missing page without calling exportAll', async () => {
    const config = new ConfigService(CONFIG_MOCK_ENVS.configured);
    const db = createMockDrizzleDb();
    const fs = createMockFileSystem();
    const staticExport = new StaticExportService(db, fs, config);
    const exportSpy = vi.spyOn(staticExport, 'exportAll');
    const service = new PagesService(db, staticExport);

    await expect(service.findOne(PAGE_MOCK_FIXTURES.missingPageId)).rejects.toThrow(NotFoundException);
    await expect(
      service.update(PAGE_MOCK_FIXTURES.missingPageId, PAGE_MOCK_FIXTURES.updatePayload)
    ).rejects.toThrow(NotFoundException);
    await expect(service.remove(PAGE_MOCK_FIXTURES.missingPageId)).rejects.toThrow(NotFoundException);
    expect(exportSpy).not.toHaveBeenCalled();
    expect(fs.writeFileAtomic).not.toHaveBeenCalled();
  });
});
