import { ConfigService } from '../config/config.service';
import { createMockFileSystem } from '../mocks/file-system.mock';
import { CONFIG_MOCK_ENVS, MEDIA_MOCK_FIXTURES } from '../mocks/static-export-fixtures.mock';
import { MediaStorageService } from './media-storage.service';

describe('MediaStorageService', () => {
  it('should save media buffer into configured mediaDir and return public url', async () => {
    const config = new ConfigService(CONFIG_MOCK_ENVS.configured);
    const fs = createMockFileSystem();
    const storage = new MediaStorageService(fs, config);

    const saved = await storage.saveFile(
      MEDIA_MOCK_FIXTURES.validPngUpload.originalname,
      MEDIA_MOCK_FIXTURES.targetMediaId,
      MEDIA_MOCK_FIXTURES.validPngUpload.buffer
    );

    expect(saved.filename).toContain('.png');
    expect(saved.url).toBe(`/content-media/${saved.filename}`);
    expect(fs.mkdir).toHaveBeenCalledWith(config.mediaDir);
    expect(fs.getWrittenFiles()).toContain(`${config.mediaDir}/${saved.filename}`);
  });

  it('should sanitize path traversal sequences in filenames when saving', async () => {
    const config = new ConfigService(CONFIG_MOCK_ENVS.configured);
    const fs = createMockFileSystem();
    const storage = new MediaStorageService(fs, config);

    const saved = await storage.saveFile(
      MEDIA_MOCK_FIXTURES.traversalUpload.originalname,
      MEDIA_MOCK_FIXTURES.targetMediaId,
      MEDIA_MOCK_FIXTURES.traversalUpload.buffer
    );

    expect(saved.filename).not.toContain('..');
    expect(saved.filename).not.toContain('/');
    expect(fs.getWrittenFiles()).toEqual([`${config.mediaDir}/${saved.filename}`]);
  });

  it('should delete media file from configured mediaDir using sanitized basename', async () => {
    const config = new ConfigService(CONFIG_MOCK_ENVS.configured);
    const targetFilename = MEDIA_MOCK_FIXTURES.existingMedia[0].filename;
    const fs = createMockFileSystem({
      [`${config.mediaDir}/${targetFilename}`]: MEDIA_MOCK_FIXTURES.validPngUpload.buffer
    });
    const storage = new MediaStorageService(fs, config);

    await storage.deleteFile(targetFilename);

    expect(fs.getDeletedPaths()).toContain(`${config.mediaDir}/${targetFilename}`);
  });
});
