import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  access,
  mkdir,
  readdir as fsReaddir,
  readFile,
  rename,
  rm as fsRm,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { dirname } from 'node:path';
import { isRecord } from '../common/type-guards.util';

export const FILE_SYSTEM = Symbol('FILE_SYSTEM');

export interface FileSystemEntry {
  readonly name: string;
  readonly isDirectory: boolean;
  readonly isFile: boolean;
}

export interface FileSystemRemoveOptions {
  readonly recursive?: boolean;
  readonly force?: boolean;
}

export interface FileSystemPort {
  readFile(filePath: string): Promise<string>;
  readBuffer(filePath: string): Promise<Buffer>;
  writeFile(filePath: string, content: string | Buffer): Promise<void>;
  writeFileAtomic(filePath: string, content: string | Buffer): Promise<void>;
  mkdir(dirPath: string): Promise<void>;
  unlink(filePath: string): Promise<void>;
  readdir(dirPath: string): Promise<FileSystemEntry[]>;
  rm(targetPath: string, options?: FileSystemRemoveOptions): Promise<void>;
  exists(filePath: string): Promise<boolean>;
}

@Injectable()
export class FileSystemService implements FileSystemPort {
  async readFile(filePath: string): Promise<string> {
    return readFile(filePath, 'utf8');
  }

  async readBuffer(filePath: string): Promise<Buffer> {
    return readFile(filePath);
  }

  async writeFile(filePath: string, content: string | Buffer): Promise<void> {
    await writeFile(filePath, content);
  }

  async writeFileAtomic(filePath: string, content: string | Buffer): Promise<void> {
    const dir = dirname(filePath);
    await mkdir(dir, { recursive: true });
    const tempPath = `${filePath}.${randomUUID()}.tmp`;
    try {
      await writeFile(tempPath, content);
      try {
        await rename(tempPath, filePath);
      } catch (error: unknown) {
        if (!isErrnoCode(error, 'EBUSY')) {
          throw error;
        }
        await writeFile(filePath, content);
        await unlink(tempPath).catch(() => undefined);
      }
    } catch (error) {
      await unlink(tempPath).catch(() => undefined);
      throw error;
    }
  }

  async mkdir(dirPath: string): Promise<void> {
    await mkdir(dirPath, { recursive: true });
  }

  async unlink(filePath: string): Promise<void> {
    await unlink(filePath);
  }

  async readdir(dirPath: string): Promise<FileSystemEntry[]> {
    const entries = await fsReaddir(dirPath, { withFileTypes: true });
    return entries.map((entry) => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
      isFile: entry.isFile(),
    }));
  }

  async rm(targetPath: string, options?: FileSystemRemoveOptions): Promise<void> {
    await fsRm(targetPath, options);
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      await access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

function isErrnoCode(error: unknown, code: string): boolean {
  return isRecord(error) && error['code'] === code;
}
