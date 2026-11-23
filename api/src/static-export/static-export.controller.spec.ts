import 'reflect-metadata';
import { vi } from 'vitest';
import { ConfigService } from '../config/config.service';
import { createMockDrizzleDb } from '../mocks/drizzle-db.mock';
import { createMockFileSystem } from '../mocks/file-system.mock';
import { CONFIG_MOCK_ENVS, STATIC_EXPORT_FIXTURES } from '../mocks/static-export-fixtures.mock';
import { StaticExportController } from './static-export.controller';
import { StaticExportService } from './static-export.service';

describe('StaticExportController', () => {
  it('should call StaticExportService.exportAll on POST /api/v1/export and return export result', async () => {
    const config = new ConfigService(CONFIG_MOCK_ENVS.configured);
    const db = createMockDrizzleDb();
    db.seedTableRows('pages', STATIC_EXPORT_FIXTURES.pages);
    db.seedTableRows('urls', STATIC_EXPORT_FIXTURES.urls);
    db.seedTableRows('media', STATIC_EXPORT_FIXTURES.media);
    const fs = createMockFileSystem();
    const service = new StaticExportService(db, fs, config);
    const exportSpy = vi.spyOn(service, 'exportAll');
    const controller = new StaticExportController(service);

    const result = await controller.exportAll();

    expect(exportSpy).toHaveBeenCalledTimes(1);
    expect(result).toBeDefined();
    expect(fs.getFile(`${config.staticPagesDir}/routes.json`)).toBeDefined();
  });

  it('should propagate errors when StaticExportService.exportAll fails', async () => {
    const config = new ConfigService(CONFIG_MOCK_ENVS.configured);
    const db = createMockDrizzleDb();
    db.setShouldFail(true);
    const fs = createMockFileSystem();
    const service = new StaticExportService(db, fs, config);
    const controller = new StaticExportController(service);

    await expect(controller.exportAll()).rejects.toThrow();
  });
});
