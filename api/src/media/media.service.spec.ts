import { BadRequestException, NotFoundException } from '@nestjs/common';
import { vi } from 'vitest';
import { ConfigService } from '../config/config.service';
import { createMockDrizzleDb } from '../mocks/drizzle-db.mock';
import { createMockFileSystem } from '../mocks/file-system.mock';
import { CONFIG_MOCK_ENVS, MEDIA_MOCK_FIXTURES } from '../mocks/static-export-fixtures.mock';
import { StaticExportService } from '../static-export/static-export.service';
import { MediaStorageService } from './media-storage.service';
import { MediaService } from './media.service';

describe('MediaService', () => {
  it('should return recorded media items from PostgreSQL via findAll without touching disk', async () => {
    const config = new ConfigService(CONFIG_MOCK_ENVS.configured);
    const db = createMockDrizzleDb();
    db.seedTableRows('media', MEDIA_MOCK_FIXTURES.existingMedia);
    const fs = createMockFileSystem();
    const service = new MediaService(
      db,
      new MediaStorageService(fs, config),
      new StaticExportService(db, fs, config)
    );

    const records = await service.findAll();

    expect(records).toEqual(MEDIA_MOCK_FIXTURES.existingMedia);
    expect(fs.readdir).not.toHaveBeenCalled();
    expect(fs.readFile).not.toHaveBeenCalled();
    expect(fs.readBuffer).not.toHaveBeenCalled();
    expect(fs.getWrittenFiles()).toHaveLength(0);
  });

  it('should copy valid uploaded media into public/images, record metadata in PostgreSQL, and run StaticExportService.exportAll', async () => {
    const config = new ConfigService(CONFIG_MOCK_ENVS.configured);
    const db = createMockDrizzleDb();
    const fs = createMockFileSystem();
    const staticExport = new StaticExportService(db, fs, config);
    const exportSpy = vi.spyOn(staticExport, 'exportAll');
    const service = new MediaService(db, new MediaStorageService(fs, config), staticExport);

    const record = await service.upload(MEDIA_MOCK_FIXTURES.validWebpUpload);

    expect(record.filename).toContain('.webp');
    expect(record.url.startsWith('/images/')).toBe(true);
    expect(record.mimeType).toBe('image/webp');
    expect(record.sizeBytes).toBe(MEDIA_MOCK_FIXTURES.validWebpUpload.size);
    expect(fs.mkdir).toHaveBeenCalledWith(config.mediaDir);
    expect(fs.getWrittenFiles().some((p) => p.startsWith(`${config.mediaDir}/`))).toBe(true);
    expect(db.getTableRows('media')).toHaveLength(1);
    expect(exportSpy).toHaveBeenCalledTimes(1);
    expect(fs.getFile(`${config.staticPagesDir}/routes.json`)).toBeDefined();
  });

  it('should sanitize path traversal sequences in uploaded filenames so files stay inside mediaDir', async () => {
    const config = new ConfigService(CONFIG_MOCK_ENVS.configured);
    const db = createMockDrizzleDb();
    const fs = createMockFileSystem();
    const service = new MediaService(
      db,
      new MediaStorageService(fs, config),
      new StaticExportService(db, fs, config)
    );

    const record = await service.upload(MEDIA_MOCK_FIXTURES.traversalUpload);

    expect(record.filename).not.toContain('..');
    expect(record.filename).not.toContain('/');
    expect(
      fs.getWrittenFiles().every((p) => p.startsWith(`${config.mediaDir}/`) && !p.includes('..'))
    ).toBe(true);
  });

  it('should reject unsupported MIME types with BadRequestException without writing files, mutating database, or calling exportAll', async () => {
    const config = new ConfigService(CONFIG_MOCK_ENVS.configured);
    const db = createMockDrizzleDb();
    const fs = createMockFileSystem();
    const staticExport = new StaticExportService(db, fs, config);
    const exportSpy = vi.spyOn(staticExport, 'exportAll');
    const service = new MediaService(db, new MediaStorageService(fs, config), staticExport);

    await expect(service.upload(MEDIA_MOCK_FIXTURES.invalidMimeUpload)).rejects.toThrow(
      BadRequestException
    );
    expect(fs.getWrittenFiles()).toHaveLength(0);
    expect(db.getTableRows('media')).toHaveLength(0);
    expect(exportSpy).not.toHaveBeenCalled();
  });

  it('should reject PNG, JPEG and non-WebP files with the WebP-only message without side effects', async () => {
    const config = new ConfigService(CONFIG_MOCK_ENVS.configured);
    const db = createMockDrizzleDb();
    const fs = createMockFileSystem();
    const staticExport = new StaticExportService(db, fs, config);
    const exportSpy = vi.spyOn(staticExport, 'exportAll');
    const service = new MediaService(db, new MediaStorageService(fs, config), staticExport);
    const rejected = [
      MEDIA_MOCK_FIXTURES.pngUpload,
      MEDIA_MOCK_FIXTURES.jpegUpload,
      MEDIA_MOCK_FIXTURES.mislabelledPngUpload
    ];

    for (const upload of rejected) {
      await expect(service.upload(upload)).rejects.toThrow('Only WebP images are allowed');
    }
    expect(fs.getWrittenFiles()).toHaveLength(0);
    expect(db.getTableRows('media')).toHaveLength(0);
    expect(exportSpy).not.toHaveBeenCalled();
  });

  it('should reject oversized or zero-byte uploads with BadRequestException without writing files or calling exportAll', async () => {
    const config = new ConfigService(CONFIG_MOCK_ENVS.configured);
    const db = createMockDrizzleDb();
    const fs = createMockFileSystem();
    const staticExport = new StaticExportService(db, fs, config);
    const exportSpy = vi.spyOn(staticExport, 'exportAll');
    const service = new MediaService(db, new MediaStorageService(fs, config), staticExport);

    await expect(service.upload(MEDIA_MOCK_FIXTURES.oversizedUpload)).rejects.toThrow(
      BadRequestException
    );
    await expect(service.upload(MEDIA_MOCK_FIXTURES.emptyUpload)).rejects.toThrow(
      BadRequestException
    );
    expect(fs.getWrittenFiles()).toHaveLength(0);
    expect(db.getTableRows('media')).toHaveLength(0);
    expect(exportSpy).not.toHaveBeenCalled();
  });

  it('should delete an existing media record and file and run StaticExportService.exportAll', async () => {
    const config = new ConfigService(CONFIG_MOCK_ENVS.configured);
    const db = createMockDrizzleDb();
    db.seedTableRows('media', MEDIA_MOCK_FIXTURES.existingMedia);
    const targetFilename = MEDIA_MOCK_FIXTURES.existingMedia[0].filename;
    const fs = createMockFileSystem({
      [`${config.mediaDir}/${targetFilename}`]: MEDIA_MOCK_FIXTURES.validWebpUpload.buffer
    });
    const staticExport = new StaticExportService(db, fs, config);
    const exportSpy = vi.spyOn(staticExport, 'exportAll');
    const service = new MediaService(db, new MediaStorageService(fs, config), staticExport);

    await service.remove(MEDIA_MOCK_FIXTURES.targetMediaId);

    expect(db.getTableRows('media')).toHaveLength(0);
    expect(fs.getDeletedPaths()).toContain(`${config.mediaDir}/${targetFilename}`);
    expect(exportSpy).toHaveBeenCalledTimes(1);
  });

  it('should throw NotFoundException when deleting non-existent media without deleting files or calling exportAll', async () => {
    const config = new ConfigService(CONFIG_MOCK_ENVS.configured);
    const db = createMockDrizzleDb();
    const fs = createMockFileSystem();
    const staticExport = new StaticExportService(db, fs, config);
    const exportSpy = vi.spyOn(staticExport, 'exportAll');
    const service = new MediaService(db, new MediaStorageService(fs, config), staticExport);

    await expect(service.remove(MEDIA_MOCK_FIXTURES.missingMediaId)).rejects.toThrow(
      NotFoundException
    );
    expect(fs.getDeletedPaths()).toHaveLength(0);
    expect(exportSpy).not.toHaveBeenCalled();
  });
});
