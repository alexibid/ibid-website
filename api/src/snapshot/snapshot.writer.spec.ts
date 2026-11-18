import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SnapshotWriteError, SnapshotWriter } from './snapshot.writer.js';
import type { FileSystemPort } from './file-system.port.js';
import { MOCK_DIRS, MOCK_SNAPSHOT, MOCK_UNSAFE_MEDIA } from './snapshot.mock.js';

function mockFiles() {
  return {
    mkdir: vi.fn<FileSystemPort['mkdir']>().mockResolvedValue(undefined),
    writeFile: vi.fn<FileSystemPort['writeFile']>().mockResolvedValue(undefined),
    copyFile: vi.fn<FileSystemPort['copyFile']>().mockResolvedValue(undefined),
    rename: vi.fn<FileSystemPort['rename']>().mockResolvedValue(undefined),
  } satisfies FileSystemPort;
}

let files: ReturnType<typeof mockFiles>;
let writer: SnapshotWriter;

beforeEach(() => {
  files = mockFiles();
  writer = new SnapshotWriter(MOCK_DIRS, files);
});


describe('SnapshotWriter', () => {
  it('should write the snapshot to a temporary file and then move it into place', async () => {
    await writer.write(MOCK_SNAPSHOT);

    const [tempPath, text] = files.writeFile.mock.calls[0] ?? [];
    expect(tempPath).toBe('/data/content/content.snapshot.json.tmp');
    expect(JSON.parse(text ?? '')).toEqual(MOCK_SNAPSHOT);
    expect(files.rename).toHaveBeenCalledWith('/data/content/content.snapshot.json.tmp', '/data/content/content.snapshot.json');
  });

  it('should copy every image the pages use into the published media folder', async () => {
    await writer.write(MOCK_SNAPSHOT);

    expect(files.copyFile).toHaveBeenCalledWith('/data/media/a.png', '/data/content-media/a.png');
    expect(files.copyFile).toHaveBeenCalledWith('/data/media/b.webp', '/data/content-media/b.webp');
  });

  it('should keep the previous snapshot when an image cannot be copied', async () => {
    files.copyFile.mockRejectedValue(new Error('ENOENT'));

    await expect(writer.write(MOCK_SNAPSHOT)).rejects.toBeInstanceOf(SnapshotWriteError);
    expect(files.rename).not.toHaveBeenCalled();
  });

  it('should keep the previous snapshot when the temporary file cannot be written', async () => {
    files.writeFile.mockRejectedValue(new Error('ENOSPC'));

    await expect(writer.write(MOCK_SNAPSHOT)).rejects.toBeInstanceOf(SnapshotWriteError);
    expect(files.rename).not.toHaveBeenCalled();
  });

  it.each(MOCK_UNSAFE_MEDIA)('should refuse the media name %j and write nothing', async (name) => {
    await expect(writer.write({ ...MOCK_SNAPSHOT, media: [name] })).rejects.toBeInstanceOf(SnapshotWriteError);

    expect(files.writeFile).not.toHaveBeenCalled();
    expect(files.copyFile).not.toHaveBeenCalled();
  });
});
