import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { DRIZZLE_DB, type DatabaseClient, toReturnedRows } from '../database/database.provider';
import { media } from '../database/schema';
import { StaticExportService } from '../static-export/static-export.service';
import { MediaStorageService } from './media-storage.service';

export interface UploadedMediaFile {
  readonly originalname: string;
  readonly mimetype: string;
  readonly size: number;
  readonly buffer: Buffer;
}

export interface MediaRecord {
  readonly id: string;
  readonly filename: string;
  readonly url: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
}

const MAX_MEDIA_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/avif',
]);

@Injectable()
export class MediaService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: DatabaseClient,
    @Inject(MediaStorageService) private readonly storage: MediaStorageService,
    @Inject(StaticExportService)
    private readonly staticExport: StaticExportService,
  ) {}

  async findAll(): Promise<MediaRecord[]> {
    const rows = await this.db.select().from(media);
    return rows.map(toMediaRecord);
  }

  async upload(file: UploadedMediaFile | undefined): Promise<MediaRecord> {
    validateUpload(file);
    const id = randomUUID();
    const stored = await this.storage.saveFile(file.originalname, id, file.buffer);

    const raw = await this.db
      .insert(media)
      .values({
        id,
        filename: stored.filename,
        url: stored.url,
        mimeType: file.mimetype,
        sizeBytes: file.size,
      })
      .returning();
    const rows = toReturnedRows(raw);
    await this.staticExport.exportAll();
    return toMediaRecord(rows[0]);
  }

  async remove(id: string): Promise<void> {
    const raw = await this.db.delete(media).where(eq(media.id, id)).returning();
    const rows = toReturnedRows(raw);
    if (rows.length === 0) {
      throw new NotFoundException(`Media ${id} not found`);
    }
    const deleted = toMediaRecord(rows[0]);
    await this.storage.deleteFile(deleted.filename);
    await this.staticExport.exportAll();
  }
}

function validateUpload(file: UploadedMediaFile | undefined): asserts file is UploadedMediaFile {
  if (!file) {
    throw new BadRequestException('Media file is required');
  }
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    throw new BadRequestException(`Unsupported media type: ${file.mimetype}`);
  }
  if (file.size <= 0 || file.buffer.length <= 0) {
    throw new BadRequestException('Media file must not be empty');
  }
  if (file.size > MAX_MEDIA_SIZE_BYTES || file.buffer.length > MAX_MEDIA_SIZE_BYTES) {
    throw new BadRequestException('Media file exceeds maximum allowed size');
  }
}

function toMediaRecord(row: Record<string, unknown>): MediaRecord {
  const rawMimeType = 'mimeType' in row ? row['mimeType'] : row['mime_type'];
  const rawSizeBytes = 'sizeBytes' in row ? row['sizeBytes'] : row['size_bytes'];
  return {
    id: typeof row['id'] === 'string' ? row['id'] : '',
    filename: typeof row['filename'] === 'string' ? row['filename'] : '',
    url: typeof row['url'] === 'string' ? row['url'] : '',
    mimeType: typeof rawMimeType === 'string' ? rawMimeType : '',
    sizeBytes: typeof rawSizeBytes === 'number' ? rawSizeBytes : 0,
  };
}
