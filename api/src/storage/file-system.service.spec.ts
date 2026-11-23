import type { Dirent } from 'node:fs';
import { dirname } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FILE_SYSTEM_SERVICE_FIXTURES,
  type FileSystemRemoveOptions,
} from '../mocks/file-system.mock';
import { FileSystemService } from './file-system.service';

const fsPromisesMock = vi.hoisted(() => ({
  access: vi.fn<(filePath: string) => Promise<void>>(),
  mkdir: vi.fn<(dirPath: string, options?: { recursive?: boolean }) => Promise<string | undefined>>(),
  readdir: vi.fn<(dirPath: string, options: { withFileTypes: true }) => Promise<Dirent[]>>(),
  readFile: vi.fn<(filePath: string, encoding?: BufferEncoding) => Promise<string | Buffer>>(),
  rename: vi.fn<(oldPath: string, newPath: string) => Promise<void>>(),
  rm: vi.fn<(targetPath: string, options?: FileSystemRemoveOptions) => Promise<void>>(),
  unlink: vi.fn<(filePath: string) => Promise<void>>(),
  writeFile: vi.fn<(filePath: string, content: string | Buffer) => Promise<void>>(),
}));

vi.mock('node:fs/promises', () => fsPromisesMock);

describe('FileSystemService', () => {
  let service: FileSystemService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new FileSystemService();
  });

  it('should read UTF-8 text and binary buffers via node:fs/promises', async () => {
    fsPromisesMock.readFile.mockResolvedValueOnce(FILE_SYSTEM_SERVICE_FIXTURES.sampleText);
    const text = await service.readFile(FILE_SYSTEM_SERVICE_FIXTURES.sampleFilePath);
    expect(text).toBe(FILE_SYSTEM_SERVICE_FIXTURES.sampleText);
    expect(fsPromisesMock.readFile).toHaveBeenCalledWith(
      FILE_SYSTEM_SERVICE_FIXTURES.sampleFilePath,
      'utf8',
    );

    fsPromisesMock.readFile.mockResolvedValueOnce(FILE_SYSTEM_SERVICE_FIXTURES.sampleBuffer);
    const buffer = await service.readBuffer(FILE_SYSTEM_SERVICE_FIXTURES.sampleFilePath);
    expect(buffer).toEqual(FILE_SYSTEM_SERVICE_FIXTURES.sampleBuffer);
    expect(fsPromisesMock.readFile).toHaveBeenLastCalledWith(
      FILE_SYSTEM_SERVICE_FIXTURES.sampleFilePath,
    );
  });

  it('should return true when access succeeds and false when access fails in exists', async () => {
    fsPromisesMock.access.mockResolvedValueOnce();
    await expect(service.exists(FILE_SYSTEM_SERVICE_FIXTURES.sampleFilePath)).resolves.toBe(true);

    fsPromisesMock.access.mockRejectedValueOnce(FILE_SYSTEM_SERVICE_FIXTURES.enoentError);
    await expect(service.exists(FILE_SYSTEM_SERVICE_FIXTURES.sampleFilePath)).resolves.toBe(false);
  });

  it('should list directory entries with file and directory flags via readdir', async () => {
    fsPromisesMock.readdir.mockResolvedValueOnce(FILE_SYSTEM_SERVICE_FIXTURES.dirents);

    const entries = await service.readdir(FILE_SYSTEM_SERVICE_FIXTURES.sampleDir);

    expect(fsPromisesMock.readdir).toHaveBeenCalledWith(
      FILE_SYSTEM_SERVICE_FIXTURES.sampleDir,
      { withFileTypes: true },
    );
    expect(entries).toEqual([
      { name: 'chapter', isDirectory: true, isFile: false },
      { name: 'home.html', isDirectory: false, isFile: true },
    ]);
  });

  it('should write temp file and rename atomically on happy path', async () => {
    fsPromisesMock.mkdir.mockResolvedValueOnce(undefined);
    fsPromisesMock.writeFile.mockResolvedValueOnce();
    fsPromisesMock.rename.mockResolvedValueOnce();

    await service.writeFileAtomic(
      FILE_SYSTEM_SERVICE_FIXTURES.sampleFilePath,
      FILE_SYSTEM_SERVICE_FIXTURES.sampleText,
    );

    expect(fsPromisesMock.mkdir).toHaveBeenCalledWith(
      dirname(FILE_SYSTEM_SERVICE_FIXTURES.sampleFilePath),
      { recursive: true },
    );
    expect(fsPromisesMock.writeFile).toHaveBeenCalledTimes(1);
    const tempPath = fsPromisesMock.writeFile.mock.calls[0]?.[0];
    expect(typeof tempPath).toBe('string');
    expect(tempPath).toContain(`${FILE_SYSTEM_SERVICE_FIXTURES.sampleFilePath}.`);
    expect(tempPath).toContain('.tmp');
    expect(fsPromisesMock.rename).toHaveBeenCalledWith(
      tempPath,
      FILE_SYSTEM_SERVICE_FIXTURES.sampleFilePath,
    );
    expect(fsPromisesMock.unlink).not.toHaveBeenCalled();
  });

  it('should fall back to direct writeFile and unlink temp file when rename throws EBUSY', async () => {
    fsPromisesMock.mkdir.mockResolvedValueOnce(undefined);
    fsPromisesMock.writeFile.mockResolvedValueOnce().mockResolvedValueOnce();
    fsPromisesMock.rename.mockRejectedValueOnce(FILE_SYSTEM_SERVICE_FIXTURES.ebusyError);
    fsPromisesMock.unlink.mockResolvedValueOnce();

    await service.writeFileAtomic(
      FILE_SYSTEM_SERVICE_FIXTURES.sampleFilePath,
      FILE_SYSTEM_SERVICE_FIXTURES.sampleText,
    );

    expect(fsPromisesMock.writeFile).toHaveBeenCalledTimes(2);
    const tempPath = fsPromisesMock.writeFile.mock.calls[0]?.[0];
    expect(fsPromisesMock.writeFile).toHaveBeenNthCalledWith(
      2,
      FILE_SYSTEM_SERVICE_FIXTURES.sampleFilePath,
      FILE_SYSTEM_SERVICE_FIXTURES.sampleText,
    );
    expect(fsPromisesMock.unlink).toHaveBeenCalledWith(tempPath);
  });

  it('should clean up temp file and rethrow when rename fails with non-EBUSY error', async () => {
    fsPromisesMock.mkdir.mockResolvedValueOnce(undefined);
    fsPromisesMock.writeFile.mockResolvedValueOnce();
    fsPromisesMock.rename.mockRejectedValueOnce(FILE_SYSTEM_SERVICE_FIXTURES.eaccesError);
    fsPromisesMock.unlink.mockResolvedValueOnce();

    await expect(
      service.writeFileAtomic(
        FILE_SYSTEM_SERVICE_FIXTURES.sampleFilePath,
        FILE_SYSTEM_SERVICE_FIXTURES.sampleText,
      ),
    ).rejects.toThrow('EACCES');

    expect(fsPromisesMock.writeFile).toHaveBeenCalledTimes(1);
    expect(fsPromisesMock.unlink).toHaveBeenCalledTimes(1);
  });

  it('should propagate read errors from node:fs/promises', async () => {
    fsPromisesMock.readFile.mockRejectedValueOnce(FILE_SYSTEM_SERVICE_FIXTURES.readError);

    await expect(service.readFile(FILE_SYSTEM_SERVICE_FIXTURES.sampleFilePath)).rejects.toThrow(
      'EIO',
    );
  });
});
