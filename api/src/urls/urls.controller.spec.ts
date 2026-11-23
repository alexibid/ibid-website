import 'reflect-metadata';
import { vi } from 'vitest';
import { isRecord } from '../common/type-guards.util';
import { ConfigService } from '../config/config.service';
import { createMockDrizzleDb } from '../mocks/drizzle-db.mock';
import { createMockFileSystem } from '../mocks/file-system.mock';
import { CONFIG_MOCK_ENVS, URL_MOCK_FIXTURES } from '../mocks/static-export-fixtures.mock';
import { StaticExportService } from '../static-export/static-export.service';
import { UrlsController } from './urls.controller';
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

describe('UrlsController', () => {
  it('should handle GET /api/v1/urls?expand=page with a single leftJoin returning page metadata without content', async () => {
    const config = new ConfigService(CONFIG_MOCK_ENVS.configured);
    const db = createMockDrizzleDb();
    db.seedTableRows('pages', URL_MOCK_FIXTURES.existingPages);
    db.seedTableRows('urls', URL_MOCK_FIXTURES.existingUrls);
    const fs = createMockFileSystem();
    const service = new UrlsService(db, new StaticExportService(db, fs, config));
    const findAllSpy = vi.spyOn(service, 'findAll');
    const controller = new UrlsController(service);

    const results = await controller.findAll(undefined, 'page');

    expect(findAllSpy).toHaveBeenCalledWith({ lang: undefined, expandPage: true });
    expect(db.select).toHaveBeenCalledTimes(1);
    expect(results).toHaveLength(URL_MOCK_FIXTURES.existingUrls.length);
    for (const item of results) {
      const page = readExpandedPage(item);
      expect(page).toBeDefined();
      expect(page).not.toBeNull();
      expect(page).not.toHaveProperty('content');
      expect(typeof page?.['title']).toBe('string');
    }

    db.select.mockClear();
    const ptResults = await controller.findAll('pt', 'page');
    expect(findAllSpy).toHaveBeenLastCalledWith({ lang: 'pt', expandPage: true });
    expect(db.select).toHaveBeenCalledTimes(1);
    expect(ptResults).toHaveLength(2);
  });

  it('should list plain urls without page expansion when expand query is omitted or not page', async () => {
    const config = new ConfigService(CONFIG_MOCK_ENVS.configured);
    const db = createMockDrizzleDb();
    db.seedTableRows('pages', URL_MOCK_FIXTURES.existingPages);
    db.seedTableRows('urls', URL_MOCK_FIXTURES.existingUrls);
    const fs = createMockFileSystem();
    const service = new UrlsService(db, new StaticExportService(db, fs, config));
    const findAllSpy = vi.spyOn(service, 'findAll');
    const controller = new UrlsController(service);

    const plainResults = await controller.findAll(undefined, undefined);
    expect(findAllSpy).toHaveBeenCalledWith({ lang: undefined, expandPage: false });
    expect(plainResults.every((entry) => !('page' in entry))).toBe(true);

    const otherExpandResults = await controller.findAll('pt', 'other');
    expect(findAllSpy).toHaveBeenLastCalledWith({ lang: 'pt', expandPage: false });
    expect(otherExpandResults).toHaveLength(2);
    expect(otherExpandResults.every((entry) => !('page' in entry))).toBe(true);
  });
});
