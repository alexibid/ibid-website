import { Inject, Injectable } from '@nestjs/common';
import { basename, join } from 'node:path';
import { ConfigService } from '../config/config.service';
import { FILE_SYSTEM, type FileSystemPort } from '../storage/file-system.service';

export interface StoredMediaFile {
  readonly filename: string;
  readonly url: string;
}

@Injectable()
export class MediaStorageService {
  constructor(
    @Inject(FILE_SYSTEM) private readonly fs: FileSystemPort,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  async saveFile(originalname: string, id: string, buffer: Buffer): Promise<StoredMediaFile> {
    const safeFilename = sanitizeFilename(originalname, id);
    const destPath = join(this.config.mediaDir, safeFilename);
    await this.fs.mkdir(this.config.mediaDir);
    await this.fs.writeFile(destPath, buffer);
    return {
      filename: safeFilename,
      url: `/images/${safeFilename}`,
    };
  }

  async deleteFile(filename: string): Promise<void> {
    const safeFilename = basename(filename);
    await this.fs.unlink(join(this.config.mediaDir, safeFilename));
  }
}

function sanitizeFilename(originalname: string, id: string): string {
  const base = basename(originalname.replace(/\\/g, '/'));
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/^\.+/, '');
  const safeBase = cleaned.length > 0 ? cleaned : 'upload.bin';
  return `${id.slice(0, 8)}-${safeBase}`;
}
