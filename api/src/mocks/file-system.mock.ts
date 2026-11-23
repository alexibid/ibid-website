import type { Dirent } from 'node:fs';
import { dirname } from 'node:path';
import { vi } from 'vitest';

export interface AtomicWriteRecord {
  path: string;
  content: string | Buffer;
}

export interface FileSystemEntry {
  name: string;
  isDirectory: boolean;
  isFile: boolean;
}

export interface FileSystemRemoveOptions {
  recursive?: boolean;
  force?: boolean;
}

export function createMockDirent(name: string, isDirectory: boolean): Dirent<string> {
  return {
    name,
    parentPath: '/virtual/pages',
    isFile: () => !isDirectory,
    isDirectory: () => isDirectory,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isSymbolicLink: () => false,
    isFIFO: () => false,
    isSocket: () => false,
  };
}

export const FILE_SYSTEM_SERVICE_FIXTURES = {
  sampleDir: '/virtual/pages/pt',
  sampleFilePath: '/virtual/pages/pt/home.html',
  sampleText: '<p>Hello portfolio</p>',
  sampleBuffer: Buffer.from([1, 2, 3, 4]),
  dirents: [createMockDirent('chapter', true), createMockDirent('home.html', false)],
  removeOptions: { recursive: true, force: true },
  ebusyError: Object.assign(new Error('EBUSY: resource busy or locked'), { code: 'EBUSY' }),
  eaccesError: Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' }),
  enoentError: Object.assign(new Error('ENOENT: no such file'), { code: 'ENOENT' }),
  readError: new Error('EIO: read failure'),
};

function normalizePath(targetPath: string): string {
  return targetPath.length > 1 ? targetPath.replace(/\/+$/, '') : targetPath;
}

function addParentDirectories(directories: Set<string>, filePath: string): void {
  let current = dirname(normalizePath(filePath));
  while (current && current !== '/' && current !== '.') {
    directories.add(current);
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
}

export function createMockFileSystem(initialFiles: Record<string, string | Buffer> = {}) {
  const files = new Map<string, string | Buffer>();
  const directories = new Set<string>();
  const writtenFiles: string[] = [];
  const atomicWrites: AtomicWriteRecord[] = [];
  const deletedPaths: string[] = [];
  const removedPaths: string[] = [];
  let shouldFailWrite = false;
  let shouldFailRead = false;

  for (const [rawPath, content] of Object.entries(initialFiles)) {
    const normalized = normalizePath(rawPath);
    files.set(normalized, content);
    addParentDirectories(directories, normalized);
  }

  const hasPath = (targetPath: string): boolean => {
    const normalized = normalizePath(targetPath);
    if (files.has(normalized) || directories.has(normalized)) return true;
    const prefix = `${normalized}/`;
    for (const key of files.keys()) {
      if (key.startsWith(prefix)) return true;
    }
    return false;
  };

  const readFile = vi.fn(async (filePath: string): Promise<string> => {
    if (shouldFailRead) throw new Error(`Mock read failure: ${filePath}`);
    const content = files.get(normalizePath(filePath));
    if (content === undefined) throw new Error(`ENOENT: no such file ${filePath}`);
    return typeof content === 'string' ? content : content.toString('utf8');
  });

  const readBuffer = vi.fn(async (filePath: string): Promise<Buffer> => {
    if (shouldFailRead) throw new Error(`Mock read failure: ${filePath}`);
    const content = files.get(normalizePath(filePath));
    if (content === undefined) throw new Error(`ENOENT: no such file ${filePath}`);
    return typeof content === 'string' ? Buffer.from(content, 'utf8') : content;
  });

  const writeFile = vi.fn(async (filePath: string, content: string | Buffer): Promise<void> => {
    if (shouldFailWrite) throw new Error(`Mock write failure: ${filePath}`);
    const normalized = normalizePath(filePath);
    files.set(normalized, content);
    addParentDirectories(directories, normalized);
    writtenFiles.push(normalized);
  });

  const writeFileAtomic = vi.fn(async (filePath: string, content: string | Buffer): Promise<void> => {
    if (shouldFailWrite) throw new Error(`Mock atomic write failure: ${filePath}`);
    const normalized = normalizePath(filePath);
    files.set(normalized, content);
    addParentDirectories(directories, normalized);
    atomicWrites.push({ path: normalized, content });
  });

  const mkdir = vi.fn(async (dirPath: string): Promise<void> => {
    if (shouldFailWrite) throw new Error(`Mock mkdir failure: ${dirPath}`);
    const normalized = normalizePath(dirPath);
    directories.add(normalized);
    addParentDirectories(directories, normalized);
  });

  const unlink = vi.fn(async (filePath: string): Promise<void> => {
    if (shouldFailWrite) throw new Error(`Mock unlink failure: ${filePath}`);
    const normalized = normalizePath(filePath);
    files.delete(normalized);
    deletedPaths.push(normalized);
  });

  const readdir = vi.fn(async (dirPath: string): Promise<FileSystemEntry[]> => {
    if (shouldFailRead) throw new Error(`Mock readdir failure: ${dirPath}`);
    const normalized = normalizePath(dirPath);
    if (!hasPath(normalized)) throw new Error(`ENOENT: no such directory ${dirPath}`);
    const prefix = normalized === '/' ? '/' : `${normalized}/`;
    const entries = new Map<string, FileSystemEntry>();

    for (const fileKey of files.keys()) {
      if (!fileKey.startsWith(prefix)) continue;
      const rest = fileKey.slice(prefix.length);
      if (!rest) continue;
      const slashIndex = rest.indexOf('/');
      if (slashIndex === -1) {
        entries.set(rest, { name: rest, isDirectory: false, isFile: true });
      } else {
        const childDir = rest.slice(0, slashIndex);
        entries.set(childDir, { name: childDir, isDirectory: true, isFile: false });
      }
    }

    for (const dirKey of directories) {
      if (!dirKey.startsWith(prefix)) continue;
      const rest = dirKey.slice(prefix.length);
      if (!rest) continue;
      const slashIndex = rest.indexOf('/');
      const childDir = slashIndex === -1 ? rest : rest.slice(0, slashIndex);
      if (!entries.has(childDir)) {
        entries.set(childDir, { name: childDir, isDirectory: true, isFile: false });
      }
    }

    return [...entries.values()].sort((a, b) => a.name.localeCompare(b.name));
  });

  const rm = vi.fn(async (targetPath: string, options?: FileSystemRemoveOptions): Promise<void> => {
    if (shouldFailWrite) throw new Error(`Mock rm failure: ${targetPath}`);
    const normalized = normalizePath(targetPath);
    const prefix = `${normalized}/`;
    const existsTarget = hasPath(normalized);
    if (!existsTarget && !options?.force) {
      throw new Error(`ENOENT: no such path ${targetPath}`);
    }
    if (files.has(normalized)) {
      files.delete(normalized);
    } else if (directories.has(normalized)) {
      const hasChildren =
        [...files.keys()].some((k) => k.startsWith(prefix)) ||
        [...directories].some((d) => d.startsWith(prefix));
      if (hasChildren && !options?.recursive) {
        throw new Error(`ENOTEMPTY: directory not empty ${targetPath}`);
      }
      directories.delete(normalized);
    }
    if (options?.recursive) {
      for (const fileKey of [...files.keys()]) {
        if (fileKey.startsWith(prefix)) files.delete(fileKey);
      }
      for (const dirKey of [...directories]) {
        if (dirKey === normalized || dirKey.startsWith(prefix)) directories.delete(dirKey);
      }
    }
    removedPaths.push(normalized);
  });

  const exists = vi.fn(async (filePath: string): Promise<boolean> => hasPath(filePath));

  return {
    readFile,
    readBuffer,
    writeFile,
    writeFileAtomic,
    mkdir,
    unlink,
    readdir,
    rm,
    exists,
    getFile: (filePath: string): string | Buffer | undefined => files.get(normalizePath(filePath)),
    getWrittenFiles: (): string[] => [...writtenFiles],
    getAtomicWrites: (): AtomicWriteRecord[] => [...atomicWrites],
    getDeletedPaths: (): string[] => [...deletedPaths],
    getRemovedPaths: (): string[] => [...removedPaths],
    getCreatedDirectories: (): string[] => [...directories],
    hasDirectory: (dirPath: string): boolean => directories.has(normalizePath(dirPath)),
    seedFile: (filePath: string, content: string | Buffer): void => {
      const normalized = normalizePath(filePath);
      files.set(normalized, content);
      addParentDirectories(directories, normalized);
    },
    seedDirectory: (dirPath: string): void => {
      const normalized = normalizePath(dirPath);
      directories.add(normalized);
      addParentDirectories(directories, normalized);
    },
    setShouldFailWrite: (fail: boolean): void => {
      shouldFailWrite = fail;
    },
    setShouldFailRead: (fail: boolean): void => {
      shouldFailRead = fail;
    }
  };
}
