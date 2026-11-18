export interface FileSystemPort {
  mkdir(path: string, options: { recursive: boolean }): Promise<void>;
  writeFile(path: string, data: string): Promise<void>;
  copyFile(source: string, destination: string): Promise<void>;
  rename(oldPath: string, newPath: string): Promise<void>;
}

export const FILE_SYSTEM_PORT = Symbol('FILE_SYSTEM_PORT');
