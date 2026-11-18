import { Module } from '@nestjs/common';
import * as fs from 'node:fs/promises';
import { API_CONFIG } from '../config/api-config.module.js';
import type { ApiConfig } from '../config/api-config.js';
import { FILE_SYSTEM_PORT, type FileSystemPort } from './file-system.port.js';
import { SnapshotBuilder } from './snapshot.builder.js';
import { SNAPSHOT_PUBLISHER, SnapshotPublisher } from './snapshot.publisher.js';
import { SnapshotWriter } from './snapshot.writer.js';

const nodeFileSystem: FileSystemPort = {
  mkdir: async (path, options): Promise<void> => {
    await fs.mkdir(path, options);
  },
  writeFile: async (path, data): Promise<void> => {
    await fs.writeFile(path, data, 'utf8');
  },
  copyFile: async (src, dest): Promise<void> => {
    await fs.copyFile(src, dest);
  },
  rename: async (oldPath, newPath): Promise<void> => {
    await fs.rename(oldPath, newPath);
  },
};

@Module({
  providers: [
    {
      provide: FILE_SYSTEM_PORT,
      useValue: nodeFileSystem,
    },
    {
      provide: SNAPSHOT_PUBLISHER,
      useFactory: (config: ApiConfig) => {
        const builder = new SnapshotBuilder(
          { list: async () => [] },
          { list: async () => [] },
        );
        const writer = new SnapshotWriter(
          {
            contentDir: config.contentDir,
            publicMediaDir: config.publicMediaDir,
            mediaDir: config.mediaDir,
          },
          nodeFileSystem,
        );
        return new SnapshotPublisher(builder, writer);
      },
      inject: [API_CONFIG],
    },
  ],
  exports: [SNAPSHOT_PUBLISHER, FILE_SYSTEM_PORT],
})
export class SnapshotModule {}
